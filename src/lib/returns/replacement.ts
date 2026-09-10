import { db } from "@/db";
import { returnRequests, orderAddresses, orderItems, productVariants, products, shipmentAuditLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { SessionUser } from "@/lib/auth/session";
import { createDelhiveryREPL } from "@/lib/shipping/providers/delhivery/repl";
import { validateReplacementVariant } from "./validation";
import { nanoid } from "nanoid";
import {
  notifyReplacementShipped,
  notifyReplacementDelivered,
} from "./notifications";

export interface CreateReplacementReplShipmentOptions {
  requestId: string;
  adminUser: SessionUser;
}

export interface CreateReplacementReplShipmentResult {
  success: boolean;
  error?: string;
  status?: number;
  waybill?: string;
  trackingUrl?: string;
  returnRequest?: any;
}

export interface MarkReplacementCompletedOptions {
  requestId: string;
  adminUser: SessionUser;
}

export interface MarkReplacementCompletedResult {
  success: boolean;
  error?: string;
  status?: number;
  returnRequest?: any;
}

/**
 * Triggers Delhivery native REPL shipment creation for an approved replacement request.
 * Generates a single AWB for the exchange journey.
 * Enforces payment gate, replacement product/variant validation, duplicate shipment protection, and status transitions.
 */
export async function createReplacementReplShipment(
  options: CreateReplacementReplShipmentOptions
): Promise<CreateReplacementReplShipmentResult> {
  const { requestId, adminUser } = options;

  // 1. Fetch return request record
  const existing = await db.query.returnRequests.findFirst({
    where: eq(returnRequests.id, requestId),
  });

  if (!existing) {
    return { success: false, error: "Replacement request not found", status: 404 };
  }

  // 2. Validate request type
  if (existing.type !== "REPLACEMENT") {
    return {
      success: false,
      error: "Only replacement requests support Delhivery REPL. Returns use Delhivery reverse pickup.",
      status: 400,
    };
  }

  // 3. Validate status & duplicate protection
  if (existing.status === "COMPLETED" || existing.status === "REJECTED" || existing.status === "CANCELLED") {
    return {
      success: false,
      error: `Cannot create REPL shipment for a replacement request with status ${existing.status}.`,
      status: 400,
    };
  }

  if (existing.status === "PENDING_REVIEW") {
    return {
      success: false,
      error: "Replacement request must be APPROVED by admin before creating REPL shipment.",
      status: 400,
    };
  }

  if (existing.waybill && existing.status === "PROCESSING") {
    return {
      success: false,
      error: `REPL shipment has already been created for this replacement request with waybill ${existing.waybill}.`,
      status: 400,
    };
  }

  // 4. Payment Gate Enforcement
  if (existing.paymentResponsibility === "CUSTOMER_PAYS" && existing.paymentStatus !== "PAID") {
    return {
      success: false,
      error: `Customer payment of ₹${(existing.paymentAmount / 100).toFixed(
        2
      )} is required before creating REPL shipment. Current payment status is ${existing.paymentStatus}.`,
      status: 400,
    };
  }

  // 5. Fetch Original Item Details
  const item = await db.query.orderItems.findFirst({
    where: eq(orderItems.id, existing.orderItemId),
  });

  const itemQuantity = item?.quantity || 1;

  // 6. Validate Replacement Variant & Inventory
  const variantValidation = await validateReplacementVariant(
    existing.replacementProductId,
    existing.replacementVariantId,
    itemQuantity
  );

  if (!variantValidation.valid) {
    return {
      success: false,
      error: variantValidation.error || "Replacement variant validation failed.",
      status: 400,
    };
  }

  const replacementVariant = variantValidation.variant;
  const replacementProduct = variantValidation.product;
  const replacementItemDesc = `${replacementProduct?.name || replacementProduct?.title || "Replacement Item"} (${replacementVariant?.name || "Selected Variant"})`;

  // 7. Fetch Customer Shipping Address
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

  // 8. Call Delhivery REPL Provider
  let replResult;
  try {
    replResult = await createDelhiveryREPL({
      requestId: existing.id,
      orderId: existing.orderId,
      customerAddress: {
        name: shippingAddress.name,
        phone: shippingAddress.phone,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2 || undefined,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country || "India",
      },
      replacementItemDesc,
      quantity: itemQuantity,
    });
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to create Delhivery REPL shipment.",
      status: 500,
    };
  }

  if (!replResult || !replResult.waybill) {
    return {
      success: false,
      error: "Delhivery REPL creation did not return a valid waybill.",
      status: 500,
    };
  }

  // 9. Update DB replacement request record with single REPL AWB
  const now = new Date();
  const updates = {
    waybill: replResult.waybill,
    trackingUrl: replResult.trackingUrl,
    status: "PROCESSING" as const,
    updatedAt: now,
  };

  await db.update(returnRequests).set(updates).where(eq(returnRequests.id, requestId));

  // 10. Insert Audit Log
  await db.insert(shipmentAuditLogs).values({
    id: `log_${nanoid(12)}`,
    shipmentId: null,
    orderId: existing.orderId,
    adminId: adminUser.id,
    adminName: adminUser.name || adminUser.phoneNumber || "Admin",
    action: "REPLACEMENT_REPL_CREATED",
    previousState: JSON.stringify({
      status: existing.status,
      waybill: existing.waybill,
    }),
    newState: JSON.stringify({
      status: updates.status,
      waybill: updates.waybill,
      trackingUrl: updates.trackingUrl,
    }),
    notes: `Delhivery REPL exchange shipment created. Single AWB: ${replResult.waybill}`,
  });

  // 11. Trigger Notification
  await notifyReplacementShipped({
    id: existing.id,
    orderId: existing.orderId,
    customerId: existing.customerId,
    waybill: replResult.waybill,
  });

  return {
    success: true,
    waybill: replResult.waybill,
    trackingUrl: replResult.trackingUrl,
    returnRequest: {
      ...existing,
      ...updates,
    },
  };
}

/**
 * Marks a replacement request as COMPLETED upon successful exchange delivery.
 */
export async function markReplacementCompleted(
  options: MarkReplacementCompletedOptions
): Promise<MarkReplacementCompletedResult> {
  const { requestId, adminUser } = options;

  const existing = await db.query.returnRequests.findFirst({
    where: eq(returnRequests.id, requestId),
  });

  if (!existing) {
    return { success: false, error: "Replacement request not found", status: 404 };
  }

  if (existing.status !== "PROCESSING" && existing.status !== "APPROVED") {
    return {
      success: false,
      error: `Replacement request cannot be marked as completed because its status is ${existing.status}.`,
      status: 400,
    };
  }

  const now = new Date();
  const updates = {
    status: "COMPLETED" as const,
    updatedAt: now,
  };

  await db.update(returnRequests).set(updates).where(eq(returnRequests.id, requestId));

  await db.insert(shipmentAuditLogs).values({
    id: `log_${nanoid(12)}`,
    shipmentId: null,
    orderId: existing.orderId,
    adminId: adminUser.id,
    adminName: adminUser.name || adminUser.phoneNumber || "Admin",
    action: "REPLACEMENT_COMPLETED",
    previousState: JSON.stringify({
      status: existing.status,
    }),
    newState: JSON.stringify({
      status: updates.status,
    }),
    notes: `Replacement exchange completed. Request status updated to COMPLETED.`,
  });

  // Trigger Notification
  await notifyReplacementDelivered({
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
