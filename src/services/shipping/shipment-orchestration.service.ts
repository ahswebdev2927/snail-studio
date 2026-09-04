import { db } from "@/db";
import { orders, orderAddresses, orderItems, shipments, trackingEvents, orderStatusHistory, shipmentAuditLogs } from "@/db/schema";
import { eq, and, ne, desc } from "drizzle-orm";
import { getShippingProvider } from "@/lib/shipping";
import { CreateShipmentRequest, ShippingProvider } from "@/lib/shipping/types";
import { validatePreShipment } from "./shipping-policy.service";
import { nanoid } from "nanoid";
import { sendMail } from "@/services/email/email.service";
import { getOrderStatusUpdateTemplate } from "@/services/email/templates/order-status-update.template";
import { updateOrderStatus } from "@/services/checkout/order.service";

/**
 * Allowed package statuses for Delhivery cancellation per B2C lifecycle specification:
 * - Manifested
 * - In Transit
 * - Pending
 * (and early pre-pickup states like ready_to_ship, pickup_scheduled)
 */
export const ALLOWED_DELHIVERY_CANCEL_STATUSES = [
  "pending",
  "manifested",
  "ready_to_ship",
  "pickup_scheduled",
  "in_transit",
];

export interface CreateShipmentOptions {
  orderId: string;
  provider: "delhivery" | "external";
  carrier?: string;
  trackingNumber?: string; // required for external if custom
  externalCourierName?: string;
  externalTrackingUrl?: string;
  externalMetadata?: string;
  estimatedDeliveryAt?: string | Date | null;
  adminOptions?: CreateShipmentRequest["adminOptions"];
  attemptNumber?: number;
}

export interface CancelShipmentOptions {
  orderId: string;
  reason: string;
  adminId?: string;
  adminName?: string;
}

export interface RedispatchOptions {
  orderId: string;
  provider: "delhivery" | "external";
  reason: string;
  carrier?: string;
  externalCourierName?: string;
  externalTrackingNumber?: string;
  externalTrackingUrl?: string;
  externalMetadata?: string;
  adminOptions?: CreateShipmentRequest["adminOptions"];
}

export interface LogShipmentAuditOptions {
  shipmentId?: string | null;
  orderId: string;
  adminId?: string | null;
  adminName?: string;
  action: string;
  previousState?: any;
  newState?: any;
  notes?: string | null;
  txClient?: any;
}

export interface SchedulePickupOptions {
  pickupDate: string; // YYYY-MM-DD
  pickupTime?: string; // e.g. "14:00:00"
  packageCount?: number;
  adminName?: string;
  adminId?: string;
}

export interface UpdateExternalCourierOptions {
  shipmentId: string;
  orderId: string;
  externalCourierName?: string;
  trackingNumber?: string;
  externalTrackingUrl?: string;
  externalMetadata?: string;
  adminName?: string;
  adminId?: string;
}

/**
 * Records an administrative audit trail entry for shipping operations.
 */
export async function logShipmentAudit(options: LogShipmentAuditOptions) {
  const {
    shipmentId,
    orderId,
    adminId,
    adminName = "Admin",
    action,
    previousState,
    newState,
    notes,
    txClient,
  } = options;

  const client = txClient || db;
  const auditId = `audit_${nanoid(10)}`;

  await client.insert(shipmentAuditLogs).values({
    id: auditId,
    shipmentId: shipmentId || null,
    orderId,
    adminId: adminId || null,
    adminName,
    action,
    previousState: previousState ? JSON.stringify(previousState) : null,
    newState: newState ? JSON.stringify(newState) : null,
    notes: notes || null,
    createdAt: new Date(),
  });

  return auditId;
}

async function sendShipmentEmail(
  orderId: string,
  subject: string,
  newStatusLabel: string,
  notes?: string | null
) {
  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { user: true },
    });
    if (order && order.user?.email) {
      const html = getOrderStatusUpdateTemplate({
        customerName: order.user.name || "Customer",
        orderId: order.id,
        newStatus: newStatusLabel,
        statusNotes: notes || `Shipment update: ${newStatusLabel}`,
        updatedAt: new Date(),
      });
      await sendMail({
        to: order.user.email,
        subject: `${subject} - Snail Studio (#${order.id})`,
        html,
        templateName: "order_status_update",
      });
    }
  } catch (err) {
    console.error(`[Shipment Email Error] Failed for order ${orderId}:`, err);
  }
}

/**
 * Creates a new shipment attempt for an order (Delhivery API or External Courier).
 */
export async function createOrderShipment(options: CreateShipmentOptions) {
  const {
    orderId,
    provider: providerType = "delhivery",
    carrier = providerType === "external" ? "External Courier" : "Delhivery",
    trackingNumber: customTrackingNum,
    externalCourierName,
    externalTrackingUrl,
    externalMetadata,
    estimatedDeliveryAt,
    adminOptions,
    attemptNumber = 1,
  } = options;

  const now = new Date();
  const shipmentId = `ship_${nanoid(10)}`;
  const estDeliveryDate = estimatedDeliveryAt ? new Date(estimatedDeliveryAt) : null;

  return await db.transaction(async (tx) => {
    // 1. Check order existence
    const orderRecord = await tx.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        addresses: true,
        items: {
          with: { variant: true },
        },
      },
    });

    if (!orderRecord) {
      throw new Error(`Order not found: ${orderId}`);
    }

    if (orderRecord.shippingDifferenceStatus === "pending") {
      throw new Error("Cannot create shipment: Additional shipping adjustment payment is pending from customer.");
    }

    // 2. Check for active non-cancelled shipment
    const activeShipment = await tx.query.shipments.findFirst({
      where: and(
        eq(shipments.orderId, orderId),
        ne(shipments.status, "cancelled")
      ),
    });

    if (activeShipment) {
      throw new Error("An active non-cancelled shipment already exists for this order.");
    }

    // 3. Validate pre-shipment policy
    const validation = await validatePreShipment(orderId, tx);
    if (!validation.success) {
      throw new Error(`Pre-shipment validation failed: ${validation.errors.join("; ")}`);
    }

    const shippingAddr = orderRecord.addresses.find((a) => a.type === "shipping") || orderRecord.addresses[0];
    if (!shippingAddr) {
      throw new Error("Shipping address is missing for this order.");
    }

    const courierOrderId = attemptNumber > 1 ? `${orderId}-A${attemptNumber}` : orderId;

    let finalWaybill = customTrackingNum || `TRK${nanoid(10).toUpperCase()}`;
    let finalTrackingUrl = externalTrackingUrl || "";
    let finalCarrier = externalCourierName || carrier;

    // 4. Delegate to provider
    const shippingProvider = getShippingProvider(providerType);

    if (providerType === "delhivery") {
      const itemsPayload = orderRecord.items.map((item) => ({
        name: item.variant?.name || "Nail Product",
        sku: item.variant?.sku || item.variantId || "SKU-GEN",
        quantity: item.quantity,
        pricePaise: item.price,
      }));

      const totalWeight = adminOptions?.weightGrams || 500;

      const providerResult = await shippingProvider.createShipment({
        orderId,
        courierOrderId,
        attemptNumber,
        provider: "delhivery",
        address: {
          name: shippingAddr.name,
          phone: shippingAddr.phone,
          addressLine1: shippingAddr.addressLine1,
          addressLine2: shippingAddr.addressLine2 || undefined,
          city: shippingAddr.city,
          state: shippingAddr.state,
          postalCode: shippingAddr.postalCode,
          country: shippingAddr.country,
        },
        orderDetails: {
          totalAmountPaise: orderRecord.totalAmount,
          paymentMode: "Prepaid",
          items: itemsPayload,
          totalWeightGrams: totalWeight,
          shippingMode: "Surface",
        },
        adminOptions,
      });

      if (!providerResult.success) {
        throw new Error(`Delhivery dispatch failed: ${providerResult.waybill || "Unknown API error"}`);
      }

      finalWaybill = providerResult.waybill || finalWaybill;
      finalTrackingUrl = providerResult.trackingUrl || finalTrackingUrl;
      finalCarrier = "Delhivery";
    } else {
      // External courier manual dispatch
      if (!finalTrackingUrl) {
        throw new Error("Manual Tracking URL is required for external courier dispatches.");
      }

      const externalRes = await shippingProvider.createShipment({
        orderId,
        courierOrderId,
        attemptNumber,
        provider: "external",
        externalCourierName: finalCarrier,
        externalTrackingUrl: finalTrackingUrl,
        externalMetadata,
        address: {
          name: shippingAddr.name,
          phone: shippingAddr.phone,
          addressLine1: shippingAddr.addressLine1,
          addressLine2: shippingAddr.addressLine2 || undefined,
          city: shippingAddr.city,
          state: shippingAddr.state,
          postalCode: shippingAddr.postalCode,
          country: shippingAddr.country,
        },
        orderDetails: {
          totalAmountPaise: orderRecord.totalAmount,
          paymentMode: "Prepaid",
          items: [],
          totalWeightGrams: 500,
        },
      });

      finalWaybill = customTrackingNum || externalRes.waybill;
      finalTrackingUrl = externalRes.trackingUrl || finalTrackingUrl;
    }

    // 5. Insert shipment record
    await tx.insert(shipments).values({
      id: shipmentId,
      orderId,
      provider: providerType,
      courierOrderId,
      attemptNumber,
      carrier: finalCarrier,
      waybill: finalWaybill,
      trackingNumber: finalWaybill,
      trackingUrl: finalTrackingUrl,
      status: "ready_to_ship",
      shippedAt: null,
      estimatedDeliveryAt: estDeliveryDate,
      isExternal: providerType === "external",
      externalCourierName: providerType === "external" ? finalCarrier : null,
      externalMetadata: externalMetadata || null,
      serviceabilityStatus: "serviceable",
      serviceabilityCheckedAt: now,
    });

    // 6. Insert initial tracking scan event
    await tx.insert(trackingEvents).values({
      id: `evt_${nanoid(10)}`,
      shipmentId,
      status: "ready_to_ship",
      location: "Warehouse",
      description: `Shipment created via ${finalCarrier} (Attempt #${attemptNumber}). Tracking #: ${finalWaybill}.`,
      timestamp: now,
    });

    // 7. Log status history and update order record
    await tx.insert(orderStatusHistory).values({
      id: `osh_${nanoid(10)}`,
      orderId,
      status: "processing",
      notes: `Shipment (Attempt #${attemptNumber}) generated via ${finalCarrier}. Tracking #: ${finalWaybill}.`,
      createdAt: now,
    });

    // 8. Log audit entry for shipment creation
    await logShipmentAudit({
      shipmentId,
      orderId,
      action: "create",
      newState: {
        shipmentId,
        provider: providerType,
        carrier: finalCarrier,
        waybill: finalWaybill,
        courierOrderId,
        attemptNumber,
      },
      notes: `Shipment created via ${finalCarrier} (Attempt #${attemptNumber}). Tracking #: ${finalWaybill}.`,
      txClient: tx,
    });

    await tx.update(orders).set({
      status: "processing",
      addressLockedAt: now,
      updatedAt: now,
    }).where(eq(orders.id, orderId));

    // Send customer email
    await sendShipmentEmail(
      orderId,
      "Ready to Ship",
      "Ready to Ship",
      `Your order is packed and ready. Dispatched via ${finalCarrier}. Tracking #: ${finalWaybill}.`
    );

    return {
      success: true,
      shipmentId,
      waybill: finalWaybill,
      courierOrderId,
      attemptNumber,
      trackingUrl: finalTrackingUrl,
      carrier: finalCarrier,
    };
  });
}

/**
 * Cancels an active shipment attempt.
 * Enforces Delhivery package status cancellation rules: allowed ONLY when status is
 * Manifested, In Transit, Pending (or pre-pickup). Rejects Dispatched/Delivered.
 * Atomically reverts order status back to 'processing' and records mandatory admin reason.
 */
export async function cancelOrderShipment(options: CancelShipmentOptions) {
  const { orderId, reason, adminName = "Admin", adminId } = options;
  const trimmedReason = reason?.trim();

  if (!trimmedReason || trimmedReason.length < 3) {
    throw new Error("A valid cancellation reason (minimum 3 characters) is required.");
  }

  const activeShipment = await db.query.shipments.findFirst({
    where: and(
      eq(shipments.orderId, orderId),
      ne(shipments.status, "cancelled")
    ),
  });

  if (!activeShipment) {
    throw new Error("No active shipment found for this order to cancel.");
  }

  // Check Delhivery cancellation status rules
  if (activeShipment.provider === "delhivery") {
    const currentStatus = activeShipment.status.toLowerCase();
    const isDisallowed = ["dispatched", "out_for_delivery", "delivered", "rto"].includes(currentStatus);
    const isAllowed = ALLOWED_DELHIVERY_CANCEL_STATUSES.includes(currentStatus);

    if (isDisallowed || !isAllowed) {
      throw new Error(
        `Delhivery shipment cannot be cancelled because the package status is '${activeShipment.status}'. ` +
        `Delhivery API rules only permit cancellation when the package status is Manifested, In Transit, or Pending.`
      );
    }

    // Call Delhivery API cancel
    try {
      const provider = getShippingProvider("delhivery");
      await provider.cancelShipment({
        waybill: activeShipment.waybill || activeShipment.trackingNumber,
        courierOrderId: activeShipment.courierOrderId,
        reason: trimmedReason,
        currentStatus: activeShipment.status,
      });
    } catch (err: any) {
      console.warn(`Delhivery API cancel notice for ${activeShipment.waybill}:`, err.message);
    }
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    // 1. Mark shipment as cancelled
    await tx.update(shipments).set({
      status: "cancelled",
      cancelledAt: now,
      updatedAt: now,
    }).where(eq(shipments.id, activeShipment.id));

    // 2. Add tracking event
    await tx.insert(trackingEvents).values({
      id: `evt_${nanoid(10)}`,
      shipmentId: activeShipment.id,
      status: "cancelled",
      location: "Warehouse / Courier System",
      description: `Shipment attempt #${activeShipment.attemptNumber} cancelled by ${adminName}. Reason: ${trimmedReason}`,
      timestamp: now,
    });

    // 3. Revert order status to processing for re-dispatch capability
    await tx.update(orders).set({
      status: "processing",
      updatedAt: now,
    }).where(eq(orders.id, orderId));

    // 4. Log detailed note in orderStatusHistory
    await tx.insert(orderStatusHistory).values({
      id: `osh_${nanoid(10)}`,
      orderId,
      status: "processing",
      notes: `Shipment #${activeShipment.trackingNumber} (Attempt #${activeShipment.attemptNumber}) cancelled by ${adminName}. Reason: "${trimmedReason}". Order state reverted to Processing for re-dispatch.`,
      createdAt: now,
    });

    // 5. Log audit entry for cancellation
    await logShipmentAudit({
      shipmentId: activeShipment.id,
      orderId,
      adminId,
      adminName,
      action: "cancel",
      previousState: {
        status: activeShipment.status,
        waybill: activeShipment.waybill,
        courierOrderId: activeShipment.courierOrderId,
      },
      newState: { status: "cancelled" },
      notes: `Shipment attempt #${activeShipment.attemptNumber} cancelled. Reason: ${trimmedReason}`,
      txClient: tx,
    });
  });

  // Notify customer
  await sendShipmentEmail(
    orderId,
    "Shipment Cancelled",
    "Processing",
    `Your active shipment (#${activeShipment.trackingNumber}) has been cancelled by customer support. Reason: ${trimmedReason}. Your order remains active for re-dispatch.`
  );

  return {
    success: true,
    message: `Shipment #${activeShipment.trackingNumber} successfully cancelled. Order status reverted to processing.`,
  };
}

/**
 * Re-dispatches an order by cancelling any existing active shipment and incrementing attemptNumber.
 */
export async function redispatchOrderShipment(options: RedispatchOptions) {
  const { orderId, provider, reason } = options;

  // 1. Find last shipment attempt
  const lastShipment = await db.query.shipments.findFirst({
    where: eq(shipments.orderId, orderId),
    orderBy: [desc(shipments.attemptNumber)],
  });

  // 2. If active non-cancelled shipment exists, cancel it first
  if (lastShipment && lastShipment.status !== "cancelled") {
    await cancelOrderShipment({
      orderId,
      reason: `Re-dispatch requested: ${reason}`,
    });
  }

  const nextAttempt = lastShipment ? (lastShipment.attemptNumber || 1) + 1 : 1;

  // 3. Create new shipment attempt
  return await createOrderShipment({
    orderId,
    provider,
    carrier: options.carrier || options.externalCourierName,
    trackingNumber: options.externalTrackingNumber,
    externalCourierName: options.externalCourierName,
    externalTrackingUrl: options.externalTrackingUrl,
    externalMetadata: options.externalMetadata,
    adminOptions: options.adminOptions,
    attemptNumber: nextAttempt,
  });
}

/**
 * Generates/fetches label PDF for active shipment.
 */
export async function fetchShipmentLabel(orderId: string, pdfSize: "A4" | "4R" = "4R") {
  const activeShipment = await db.query.shipments.findFirst({
    where: and(
      eq(shipments.orderId, orderId),
      ne(shipments.status, "cancelled")
    ),
  });

  if (!activeShipment) {
    throw new Error("No active non-cancelled shipment found to generate label.");
  }

  if (activeShipment.provider === "external") {
    throw new Error("Automated label generation is not available for external couriers. Use manual dispatch packing slip.");
  }

  const provider = getShippingProvider("delhivery");
  if (!provider.generateLabel) {
    throw new Error("Label generation is not supported by current provider.");
  }

  const waybill = activeShipment.waybill || activeShipment.trackingNumber;
  const labelRes = await provider.generateLabel([waybill], pdfSize);

  await logShipmentAudit({
    shipmentId: activeShipment.id,
    orderId,
    action: "label_generated",
    notes: `Generated ${pdfSize} label for waybill ${waybill}.`,
  });

  return labelRes;
}

/**
 * Schedules a warehouse pickup request with Delhivery provider using DELHIVERY_PICKUP_LOCATION.
 */
export async function scheduleShipmentPickup(options: SchedulePickupOptions) {
  const { pickupDate, pickupTime = "14:00:00", packageCount = 1, adminName = "Admin", adminId } = options;

  const provider = getShippingProvider("delhivery");
  if (!provider.createPickup) {
    throw new Error("Pickup scheduling is not supported by the current shipping provider.");
  }

  const result = await provider.createPickup({
    pickupDate,
    pickupTime,
    packageCount,
  });

  if (!result.success) {
    throw new Error(result.message || "Failed to schedule pickup with Delhivery API.");
  }

  await logShipmentAudit({
    orderId: "SYSTEM_PICKUP",
    adminId,
    adminName,
    action: "pickup_scheduled",
    newState: {
      pickupId: result.pickupId,
      pickupDate,
      pickupTime,
      packageCount,
    },
    notes: `Scheduled pickup for ${packageCount} package(s) on ${pickupDate} at ${pickupTime}. Pickup ID: ${result.pickupId || "N/A"}. ${result.message || ""}`,
  });

  return result;
}

/**
 * Updates manual external courier details for a shipment attempt.
 */
export async function updateExternalCourierDetails(options: UpdateExternalCourierOptions) {
  const {
    shipmentId,
    orderId,
    externalCourierName,
    trackingNumber,
    externalTrackingUrl,
    externalMetadata,
    adminName = "Admin",
    adminId,
  } = options;

  const existingShipment = await db.query.shipments.findFirst({
    where: eq(shipments.id, shipmentId),
  });

  if (!existingShipment) {
    throw new Error(`Shipment not found: ${shipmentId}`);
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    const updateData: any = {
      updatedAt: now,
    };
    if (externalCourierName) {
      updateData.carrier = externalCourierName;
      updateData.externalCourierName = externalCourierName;
    }
    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
      updateData.waybill = trackingNumber;
    }
    if (externalTrackingUrl) {
      updateData.trackingUrl = externalTrackingUrl;
    }
    if (externalMetadata !== undefined) {
      updateData.externalMetadata = externalMetadata;
    }

    await tx.update(shipments).set(updateData).where(eq(shipments.id, shipmentId));

    await logShipmentAudit({
      shipmentId,
      orderId,
      adminId,
      adminName,
      action: "external_updated",
      previousState: {
        carrier: existingShipment.carrier,
        trackingNumber: existingShipment.trackingNumber,
        trackingUrl: existingShipment.trackingUrl,
      },
      newState: updateData,
      notes: `External courier details updated by ${adminName}.`,
      txClient: tx,
    });
  });

  return { success: true };
}
