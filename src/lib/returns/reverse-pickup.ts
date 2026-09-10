import { db } from "@/db";
import { returnRequests, orderAddresses, orderItems, productVariants, products, shipmentAuditLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { SessionUser } from "@/lib/auth/session";
import { createDelhiveryReversePickup } from "@/lib/shipping/providers/delhivery/reverse-pickup";
import { nanoid } from "nanoid";
import {
  notifyReturnPickupCreated,
  notifyReturnReceived,
  notifyReturnCompleted,
} from "./notifications";

export interface CreateReturnReversePickupOptions {
  requestId: string;
  adminUser: SessionUser;
}

export interface CreateReturnReversePickupResult {
  success: boolean;
  error?: string;
  status?: number;
  waybill?: string;
  trackingUrl?: string;
  returnRequest?: any;
}

export interface MarkReturnReceivedOptions {
  requestId: string;
  adminUser: SessionUser;
}

export interface MarkReturnReceivedResult {
  success: boolean;
  error?: string;
  status?: number;
  returnRequest?: any;
}

/**
 * Triggers Delhivery reverse pickup creation for an approved return request.
 * Enforces payment gate, duplicate shipment protection, and status transitions.
 */
export async function createReturnReversePickup(
  options: CreateReturnReversePickupOptions
): Promise<CreateReturnReversePickupResult> {
  const { requestId, adminUser } = options;

  // 1. Fetch return request record
  const existing = await db.query.returnRequests.findFirst({
    where: eq(returnRequests.id, requestId),
  });

  if (!existing) {
    return { success: false, error: "Return request not found", status: 404 };
  }

  // 2. Validate request type
  if (existing.type !== "RETURN") {
    return {
      success: false,
      error: "Only return requests support reverse pickup. Replacements use Delhivery REPL.",
      status: 400,
    };
  }

  // 3. Validate status & duplicate protection
  if (existing.status === "COMPLETED" || existing.status === "REJECTED" || existing.status === "CANCELLED") {
    return {
      success: false,
      error: `Cannot create reverse pickup for a return request with status ${existing.status}.`,
      status: 400,
    };
  }

  if (existing.status === "PENDING_REVIEW") {
    return {
      success: false,
      error: "Return request must be APPROVED by admin before creating reverse pickup.",
      status: 400,
    };
  }

  if (existing.waybill && existing.status === "PROCESSING") {
    return {
      success: false,
      error: `Reverse pickup has already been created for this return request with waybill ${existing.waybill}.`,
      status: 400,
    };
  }

  // 4. Payment Gate Enforcement
  if (existing.paymentResponsibility === "CUSTOMER_PAYS" && existing.paymentStatus !== "PAID") {
    return {
      success: false,
      error: `Customer payment of ₹${(existing.paymentAmount / 100).toFixed(
        2
      )} is required before creating reverse pickup. Current payment status is ${existing.paymentStatus}.`,
      status: 400,
    };
  }

  // 5. Fetch Customer Shipping Address
  const shippingAddress = await db.query.orderAddresses.findFirst({
    where: and(eq(orderAddresses.orderId, existing.orderId), eq(orderAddresses.type, "shipping")),
  });

  if (!shippingAddress) {
    return {
      success: false,
      error: "Customer shipping address not found for this order.",
      status: 400,
    };
  }

  // 6. Fetch Item Details for description
  let itemDescription = "Returned Press-On Nails Set";
  const item = await db.query.orderItems.findFirst({
    where: eq(orderItems.id, existing.orderItemId),
  });

  if (item && item.variantId) {
    const variant = await db.query.productVariants.findFirst({
      where: eq(productVariants.id, item.variantId),
    });
    if (variant && variant.productId) {
      const prod = await db.query.products.findFirst({
        where: eq(products.id, variant.productId),
      });
      if (prod) {
        itemDescription = `${prod.name || "Returned Item"} (${variant.name || "Default"})`;
      }
    }
  }

  // 7. Call Delhivery Reverse Pickup Provider
  let pickupResult;
  try {
    pickupResult = await createDelhiveryReversePickup({
      requestId: existing.id,
      orderId: existing.orderId,
      pickupAddress: {
        name: shippingAddress.name,
        phone: shippingAddress.phone,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2 || undefined,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country || "India",
      },
      itemsDesc: itemDescription,
      quantity: item?.quantity || 1,
    });
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to create Delhivery reverse pickup shipment.",
      status: 500,
    };
  }

  if (!pickupResult || !pickupResult.waybill) {
    return {
      success: false,
      error: "Delhivery reverse pickup creation did not return a valid waybill.",
      status: 500,
    };
  }

  // 8. Update DB return request record
  const now = new Date();
  const updates = {
    waybill: pickupResult.waybill,
    trackingUrl: pickupResult.trackingUrl,
    status: "PROCESSING" as const,
    updatedAt: now,
  };

  await db.update(returnRequests).set(updates).where(eq(returnRequests.id, requestId));

  // 9. Insert Audit Log
  await db.insert(shipmentAuditLogs).values({
    id: `log_${nanoid(12)}`,
    shipmentId: null,
    orderId: existing.orderId,
    adminId: adminUser.id,
    adminName: adminUser.name || adminUser.phoneNumber || "Admin",
    action: "RETURN_REVERSE_PICKUP_CREATED",
    previousState: JSON.stringify({
      status: existing.status,
      waybill: existing.waybill,
    }),
    newState: JSON.stringify({
      status: updates.status,
      waybill: updates.waybill,
      trackingUrl: updates.trackingUrl,
    }),
    notes: `Reverse pickup created via Delhivery. AWB: ${pickupResult.waybill}`,
  });

  // 10. Trigger Notification
  await notifyReturnPickupCreated({
    id: existing.id,
    orderId: existing.orderId,
    customerId: existing.customerId,
    waybill: pickupResult.waybill,
  });

  return {
    success: true,
    waybill: pickupResult.waybill,
    trackingUrl: pickupResult.trackingUrl,
    returnRequest: {
      ...existing,
      ...updates,
    },
  };
}

/**
 * Marks a return request as COMPLETED upon receiving the returned items at the warehouse.
 */
export async function markReturnReceived(
  options: MarkReturnReceivedOptions
): Promise<MarkReturnReceivedResult> {
  const { requestId, adminUser } = options;

  const existing = await db.query.returnRequests.findFirst({
    where: eq(returnRequests.id, requestId),
  });

  if (!existing) {
    return { success: false, error: "Return request not found", status: 404 };
  }

  if (existing.status !== "PROCESSING" && existing.status !== "APPROVED") {
    return {
      success: false,
      error: `Return request cannot be marked as received because its status is ${existing.status}.`,
      status: 400,
    };
  }

  const now = new Date();
  const updates = {
    status: "COMPLETED" as const,
    updatedAt: now,
  };

  await db.update(returnRequests).set(updates).where(eq(returnRequests.id, requestId));

  // Insert RETURN_RECEIVED audit log
  await db.insert(shipmentAuditLogs).values({
    id: `log_${nanoid(12)}`,
    shipmentId: null,
    orderId: existing.orderId,
    adminId: adminUser.id,
    adminName: adminUser.name || adminUser.phoneNumber || "Admin",
    action: "RETURN_RECEIVED",
    previousState: JSON.stringify({
      status: existing.status,
    }),
    newState: JSON.stringify({
      status: updates.status,
    }),
    notes: `Returned item received at warehouse.`,
  });

  // Insert RETURN_COMPLETED audit log
  await db.insert(shipmentAuditLogs).values({
    id: `log_${nanoid(12)}`,
    shipmentId: null,
    orderId: existing.orderId,
    adminId: adminUser.id,
    adminName: adminUser.name || adminUser.phoneNumber || "Admin",
    action: "RETURN_COMPLETED",
    previousState: JSON.stringify({
      status: existing.status,
    }),
    newState: JSON.stringify({
      status: updates.status,
    }),
    notes: `Return request status updated to COMPLETED.`,
  });

  // Trigger Notifications
  await notifyReturnReceived({
    id: existing.id,
    orderId: existing.orderId,
    customerId: existing.customerId,
  });

  await notifyReturnCompleted({
    id: existing.id,
    orderId: existing.orderId,
    customerId: existing.customerId,
  });

  return {
    success: true,
    returnRequest: {
      ...existing,
      ...updates,
    },
  };
}
