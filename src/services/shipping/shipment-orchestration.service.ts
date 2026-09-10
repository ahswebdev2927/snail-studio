import { db } from "@/db";
import { orders, orderAddresses, orderItems, shipments, trackingEvents, orderStatusHistory, shipmentAuditLogs } from "@/db/schema";
import { eq, and, ne, desc, gte, inArray } from "drizzle-orm";
import { getShippingProvider } from "@/lib/shipping";
import { CreateShipmentRequest, ShippingProvider } from "@/lib/shipping/types";
import { validatePreShipment } from "./shipping-policy.service";
import { nanoid } from "nanoid";
import { sendMail } from "@/services/email/email.service";
import { getShipmentUpdateTemplate } from "@/services/email/templates/shipment-update.template";
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
  orderId?: string | null;
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
  shipmentIds?: string[];
  bypassActiveLock?: boolean;
  isAddToActive?: boolean;
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
    orderId: orderId && orderId !== "SYSTEM_PICKUP" ? orderId : null,
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
      with: {
        user: true,
        shipments: {
          orderBy: (s, { desc }) => [desc(s.createdAt)],
        },
      },
    });
    if (order && order.user?.email) {
      const activeShipment = order.shipments?.[0];
      const waybill = activeShipment?.waybill || activeShipment?.trackingNumber || "TRK-PENDING";
      const carrier = activeShipment?.carrier || "Courier Partner";

      const html = getShipmentUpdateTemplate({
        customerName: order.user.name || "Customer",
        orderId: order.id,
        status: activeShipment?.status || "created",
        carrier,
        trackingNumber: waybill,
        trackingUrl: activeShipment?.trackingUrl,
        estimatedDeliveryAt: activeShipment?.estimatedDeliveryAt,
        statusNotes: notes || `Shipment update: ${newStatusLabel}`,
        updatedAt: new Date(),
      });

      await sendMail({
        to: order.user.email,
        subject: `${subject} - Snail Studio (#${order.id})`,
        html,
        templateName: "shipment_update",
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
    attemptNumber: explicitAttemptNumber,
  } = options;

  const now = new Date();
  const shipmentId = `ship_${nanoid(10)}`;
  const estDeliveryDate = estimatedDeliveryAt ? new Date(estimatedDeliveryAt) : null;

  // 1. Check order existence & terminal status (read phase outside tx)
  const orderRecord = await db.query.orders.findFirst({
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

  if (["cancelled", "refunded", "partially_refunded", "shipped", "delivered"].includes(orderRecord.status.toLowerCase())) {
    throw new Error(`Cannot create shipment: Order #${orderId} is in terminal status '${orderRecord.status}'.`);
  }

  if (orderRecord.shippingDifferenceStatus === "pending") {
    throw new Error("Cannot create shipment: Additional shipping adjustment payment is pending from customer.");
  }

  // 2. Check for active non-cancelled shipment (1:1 Relationship & Safe Retry)
  const activeShipment = await db.query.shipments.findFirst({
    where: and(
      eq(shipments.orderId, orderId),
      ne(shipments.status, "cancelled")
    ),
  });

  if (activeShipment) {
    // Idempotent return for retry: return existing active shipment data
    return {
      success: true,
      shipmentId: activeShipment.id,
      waybill: activeShipment.waybill || activeShipment.trackingNumber,
      courierOrderId: activeShipment.courierOrderId,
      attemptNumber: activeShipment.attemptNumber,
      trackingUrl: activeShipment.trackingUrl || "",
      carrier: activeShipment.carrier,
      isExisting: true,
    };
  }

  // 3. Query all previous shipment attempts to compute attempt number & courier order ID
  const allExistingShipments = await db.query.shipments.findMany({
    where: eq(shipments.orderId, orderId),
  });

  const attemptNumber = explicitAttemptNumber || allExistingShipments.length + 1;
  const courierOrderId = attemptNumber > 1 ? `${orderId}-R${attemptNumber - 1}` : orderId;

  // 4. Validate pre-shipment policy
  const validation = await validatePreShipment(orderId);
  if (!validation.success) {
    throw new Error(`Pre-shipment validation failed: ${validation.errors.join("; ")}`);
  }

  const shippingAddr = orderRecord.addresses.find((a) => a.type === "shipping") || orderRecord.addresses[0];
  if (!shippingAddr) {
    throw new Error("Shipping address is missing for this order.");
  }

  let finalWaybill = customTrackingNum || `TRK${nanoid(10).toUpperCase()}`;
  let finalTrackingUrl = externalTrackingUrl || "";
  let finalCarrier = externalCourierName || carrier;

  // 4. Delegate to provider (HTTP network calls executed OUTSIDE database transaction)
  const shippingProvider = getShippingProvider(providerType);
  let generatedLabelUrl: string | null = null;

  if (providerType === "delhivery") {
    const itemsPayload = orderRecord.items.map((item) => ({
      name: item.variant?.name || "Nail Product",
      sku: item.variant?.sku || item.variantId || "SKU-GEN",
      quantity: item.quantity,
      pricePaise: item.price,
    }));

    const totalWeight = adminOptions?.weightGrams || 250;

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
        shippingMode: adminOptions?.transportSpeed === "F" ? "Express" : "Surface",
      },
      adminOptions,
    });

    if (!providerResult.success) {
      throw new Error(`Delhivery dispatch failed: ${providerResult.waybill || "Unknown API error"}`);
    }

    finalWaybill = providerResult.waybill || finalWaybill;
    finalTrackingUrl = providerResult.trackingUrl || finalTrackingUrl;
    finalCarrier = "Delhivery";

    // Attempt automatic label URL fetch for Delhivery (4R or A4 format)
    try {
      if (shippingProvider.generateLabel) {
        const labelRes = await shippingProvider.generateLabel(
          [finalWaybill],
          adminOptions?.labelFormat || "4R"
        );
        if (labelRes?.pdfUrl) {
          generatedLabelUrl = labelRes.pdfUrl;
        }
      }
    } catch (labelErr) {
      console.warn(`Label auto-generation warning for waybill ${finalWaybill}:`, labelErr);
    }
  } else {
    // External courier manual dispatch (Tracking URL is optional)
    const externalRes = await shippingProvider.createShipment({
      orderId,
      courierOrderId,
      attemptNumber,
      provider: "external",
      externalCourierName: finalCarrier,
      externalTrackingUrl: finalTrackingUrl || undefined,
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
        totalWeightGrams: adminOptions?.weightGrams || 250,
      },
    });

    finalWaybill = customTrackingNum || externalRes.waybill;
    finalTrackingUrl = externalRes.trackingUrl || finalTrackingUrl;
  }

  // 5. Execute fast DB write transaction (atomic DB writes only)
  const result = await db.transaction(async (tx) => {
    // Re-check active shipment inside transaction to prevent concurrent duplicate creation
    const recheckActive = await tx.query.shipments.findFirst({
      where: and(
        eq(shipments.orderId, orderId),
        ne(shipments.status, "cancelled")
      ),
    });

    if (recheckActive) {
      return {
        success: true,
        shipmentId: recheckActive.id,
        waybill: recheckActive.waybill || recheckActive.trackingNumber,
        courierOrderId: recheckActive.courierOrderId,
        attemptNumber: recheckActive.attemptNumber,
        trackingUrl: recheckActive.trackingUrl || "",
        carrier: recheckActive.carrier,
        isExisting: true,
      };
    }

    // Insert shipment record
    await tx.insert(shipments).values({
      id: shipmentId,
      orderId,
      provider: providerType,
      courierOrderId,
      attemptNumber,
      carrier: finalCarrier,
      waybill: finalWaybill,
      trackingNumber: finalWaybill,
      trackingUrl: finalTrackingUrl || null,
      labelUrl: generatedLabelUrl,
      status: "ready_to_ship",
      shippedAt: null,
      estimatedDeliveryAt: estDeliveryDate,
      isExternal: providerType === "external",
      externalCourierName: providerType === "external" ? finalCarrier : null,
      externalMetadata: externalMetadata || null,
      serviceabilityStatus: "serviceable",
      serviceabilityCheckedAt: now,
    });

    // Insert initial tracking scan event
    await tx.insert(trackingEvents).values({
      id: `evt_${nanoid(10)}`,
      shipmentId,
      status: "ready_to_ship",
      location: "Warehouse",
      description: `Shipment created via ${finalCarrier} (Attempt #${attemptNumber}). Tracking #: ${finalWaybill}.`,
      timestamp: now,
    });

    // Log status history
    await tx.insert(orderStatusHistory).values({
      id: `osh_${nanoid(10)}`,
      orderId,
      status: "ready_to_ship",
      notes: `Shipment (Attempt #${attemptNumber}) generated via ${finalCarrier}. Tracking #: ${finalWaybill}.`,
      createdAt: now,
    });

    // Log audit entry
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
      shipmentId: shipmentId,
      status: "ready_to_ship",
      addressLockedAt: now,
      updatedAt: now,
    }).where(eq(orders.id, orderId));

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

  // Send customer email asynchronously post DB transaction
  await sendShipmentEmail(
    orderId,
    "Ready to Ship",
    "Ready to Ship",
    `Your order is packed and ready. Dispatched via ${finalCarrier}. Tracking #: ${finalWaybill}.`
  );

  return result;
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

  const allShipments = await db.query.shipments.findMany({
    where: eq(shipments.orderId, orderId),
  });
  const maxAttemptInDb = Math.max(0, ...allShipments.map((s) => s.attemptNumber || 1));
  const nextAttempt = Math.max(allShipments.length, maxAttemptInDb) + 1;

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
 * Checks if a pickup request has already been scheduled today for the warehouse location.
 */
export async function getTodayActivePickup() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const logs = await db.query.shipmentAuditLogs.findMany({
    where: and(
      eq(shipmentAuditLogs.action, "pickup_scheduled"),
      gte(shipmentAuditLogs.createdAt, startOfDay)
    ),
    orderBy: [desc(shipmentAuditLogs.createdAt)],
    limit: 1,
  });

  if (logs.length === 0) {
    return { activePickupExists: false, latestPickup: null };
  }

  const latest = logs[0];
  let newState: any = {};
  try {
    newState = latest.newState ? JSON.parse(latest.newState) : {};
  } catch {}

  return {
    activePickupExists: true,
    latestPickup: {
      id: latest.id,
      pickupId: newState.pickupId || null,
      scheduledDate: newState.pickupDate || null,
      scheduledTime: newState.pickupTime || null,
      packageCount: newState.packageCount || 1,
      createdAt: latest.createdAt,
      adminName: latest.adminName,
    },
  };
}

/**
 * Schedules a warehouse pickup request with Delhivery provider using DELHIVERY_PICKUP_LOCATION.
 */
export async function scheduleShipmentPickup(options: SchedulePickupOptions) {
  const {
    pickupDate,
    pickupTime = "14:00:00",
    packageCount = 1,
    shipmentIds = [],
    bypassActiveLock = false,
    isAddToActive = false,
    adminName = "Admin",
    adminId,
  } = options;

  // Handle adding shipments to an active/pending pickup request
  if (isAddToActive) {
    if (shipmentIds.length > 3) {
      throw new Error(
        "Cannot add more than 3 Shipments to an active/pending Pickup request, please request for another time or after the pickup request is resolved"
      );
    }

    if (shipmentIds.length === 0) {
      throw new Error("Please select at least 1 shipment to add to the active pickup request.");
    }

    const todayActive = await getTodayActivePickup();
    if (!todayActive.activePickupExists) {
      throw new Error("No active pickup request found for today to add shipments to.");
    }

    const targetShipments = await db.query.shipments.findMany({
      where: inArray(shipments.id, shipmentIds),
    });

    if (targetShipments.length > 0) {
      await db.transaction(async (tx) => {
        for (const ship of targetShipments) {
          await tx
            .update(shipments)
            .set({
              status: "pickup_scheduled",
              updatedAt: new Date(),
            })
            .where(eq(shipments.id, ship.id));

          await logShipmentAudit({
            shipmentId: ship.id,
            orderId: ship.orderId,
            adminId,
            adminName,
            action: "pickup_scheduled",
            newState: {
              pickupId: todayActive.latestPickup?.pickupId || "Active",
              pickupDate: todayActive.latestPickup?.scheduledDate || pickupDate,
              isAddedToActive: true,
            },
            notes: `Added shipment to active pickup request (#${
              todayActive.latestPickup?.pickupId || "Active"
            }).`,
            txClient: tx,
          });
        }
      });
    }

    return {
      success: true,
      message: `Successfully added ${targetShipments.length} shipment(s) to active pickup request (#${
        todayActive.latestPickup?.pickupId || "Active"
      }).`,
      pickupId: todayActive.latestPickup?.pickupId || null,
      scheduledCount: targetShipments.length,
    };
  }

  // 1. Check active pickup limit for today if lock not explicitly bypassed
  const todayActive = await getTodayActivePickup();
  if (todayActive.activePickupExists && !bypassActiveLock) {
    return {
      success: false,
      activePickupExists: true,
      latestPickup: todayActive.latestPickup,
      message: "An active pickup request has already been scheduled today for this warehouse location.",
    };
  }

  const provider = getShippingProvider("delhivery");
  if (!provider.createPickup) {
    throw new Error("Pickup scheduling is not supported by the current shipping provider.");
  }

  const countToSchedule = shipmentIds.length > 0 ? shipmentIds.length : Math.max(1, packageCount);

  const result = await provider.createPickup({
    pickupDate,
    pickupTime,
    packageCount: countToSchedule,
  });

  if (!result.success) {
    throw new Error(result.message || "Failed to schedule pickup with Delhivery API.");
  }

  let firstOrderId: string | null = null;
  let firstShipmentId: string | null = null;

  // 2. Resolve target shipments and update status to pickup_scheduled
  let targetShipments: any[] = [];
  if (shipmentIds.length > 0) {
    targetShipments = await db.query.shipments.findMany({
      where: inArray(shipments.id, shipmentIds),
    });
  } else {
    targetShipments = await db.query.shipments.findMany({
      where: and(
        eq(shipments.provider, "delhivery"),
        inArray(shipments.status, ["ready_to_ship", "manifested"])
      ),
      limit: countToSchedule,
    });
  }

  if (targetShipments.length > 0) {
    firstOrderId = targetShipments[0].orderId;
    firstShipmentId = targetShipments[0].id;

    await db.transaction(async (tx) => {
      for (const ship of targetShipments) {
        await tx
          .update(shipments)
          .set({
            status: "pickup_scheduled",
            updatedAt: new Date(),
          })
          .where(eq(shipments.id, ship.id));

        await logShipmentAudit({
          shipmentId: ship.id,
          orderId: ship.orderId,
          adminId,
          adminName,
          action: "pickup_scheduled",
          newState: {
            pickupId: result.pickupId,
            pickupDate,
            pickupTime,
          },
          notes: `Scheduled pickup on ${pickupDate} at ${pickupTime}. Pickup ID: ${result.pickupId || "N/A"}.`,
          txClient: tx,
        });
      }
    });
  }

  // Fallback to latest active order/shipment ID for system audit logging if no ready shipments found
  if (!firstOrderId) {
    const latestOrder = await db.query.orders.findFirst({
      orderBy: [desc(orders.createdAt)],
    });
    if (latestOrder) {
      firstOrderId = latestOrder.id;
    }
  }

  if (firstOrderId) {
    await logShipmentAudit({
      shipmentId: firstShipmentId,
      orderId: firstOrderId,
      adminId,
      adminName,
      action: "pickup_scheduled",
      newState: {
        pickupId: result.pickupId,
        pickupDate,
        pickupTime,
        packageCount: countToSchedule,
        shipmentIds: targetShipments.map((s) => s.id),
        bypassedLock: bypassActiveLock,
      },
      notes: `Scheduled pickup for ${countToSchedule} package(s) on ${pickupDate} at ${pickupTime}. Pickup ID: ${result.pickupId || "N/A"}. ${result.message || ""}`,
    });
  }

  return {
    ...result,
    activePickupExists: false,
    scheduledCount: countToSchedule,
  };
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
