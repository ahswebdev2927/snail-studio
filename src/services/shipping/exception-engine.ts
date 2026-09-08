import { db } from "@/db";
import { shipments, shipmentExceptions, shipmentAuditLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NormalizedShipmentEvent } from "@/lib/shipping/event-normalizer";
import { classifyDelhiveryEvent } from "@/lib/shipping/exception-classifier";
import { nanoid } from "nanoid";

export interface ExceptionEngineResult {
  processed: boolean;
  exceptionId?: string;
  exceptionType?: string;
  actionTaken?: string;
  shipmentCancelled?: boolean;
}

/**
 * Core Unified Exception Processing Engine.
 * 
 * Idempotently processes normalized shipment tracking events, manages exception records,
 * resolves active NDRs when delivery resumes, marks pickup cancellations, and audits events.
 */
export async function processShipmentEventExceptions(
  event: NormalizedShipmentEvent
): Promise<ExceptionEngineResult> {
  const classification = classifyDelhiveryEvent(event);
  const now = new Date();

  // Fetch parent shipment record
  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.id, event.shipmentId),
  });

  if (!shipment) {
    return { processed: false, actionTaken: "Shipment record not found" };
  }

  // Find active exceptions for this shipment
  const activeExceptions = await db.query.shipmentExceptions.findMany({
    where: eq(shipmentExceptions.shipmentId, event.shipmentId),
  });

  const activeNDR = activeExceptions.find(
    (e) => e.exceptionType === "DELIVERY_NDR" && (e.status === "ACTION_REQUIRED" || e.status === "REATTEMPT_REQUESTED")
  );

  const activeRTO = activeExceptions.find(
    (e) => e.exceptionType === "RTO"
  );

  // 1. Resolution Handling: If shipment is now DELIVERED or OUT_FOR_DELIVERY, resolve active NDR
  if ((classification.type === "DELIVERED" || event.status.toLowerCase().includes("out for delivery")) && activeNDR) {
    await db
      .update(shipmentExceptions)
      .set({
        status: "RESOLVED",
        resolvedAt: now,
        updatedAt: now,
      })
      .where(eq(shipmentExceptions.id, activeNDR.id));

    await db.insert(shipmentAuditLogs).values({
      id: `sal_${nanoid(10)}`,
      shipmentId: shipment.id,
      orderId: shipment.orderId,
      adminName: "System Exception Engine",
      action: "NDR_RESOLVED",
      previousState: JSON.stringify({ status: activeNDR.status }),
      newState: JSON.stringify({ status: "RESOLVED", trigger: classification.type }),
      notes: `Active delivery NDR resolved by carrier event "${event.status}" (${classification.type}).`,
      createdAt: now,
    });
  }

  // 2. Process Delivery NDR Classification
  if (classification.type === "DELIVERY_NDR") {
    if (activeNDR) {
      // Idempotency: update attempt count and remarks if same code
      await db
        .update(shipmentExceptions)
        .set({
          attemptCount: event.dispatchCount || activeNDR.attemptCount + 1,
          remark: classification.remark || activeNDR.remark,
          updatedAt: now,
        })
        .where(eq(shipmentExceptions.id, activeNDR.id));

      return {
        processed: true,
        exceptionId: activeNDR.id,
        exceptionType: "DELIVERY_NDR",
        actionTaken: "Updated existing NDR exception attempt count and remarks",
      };
    }

    // Create new NDR Exception record
    const exceptionId = `ex_${nanoid(10)}`;
    await db.insert(shipmentExceptions).values({
      id: exceptionId,
      shipmentId: shipment.id,
      provider: shipment.provider,
      exceptionType: "DELIVERY_NDR",
      providerCode: classification.providerCode || event.statusCode || "NDR",
      reason: classification.reason || "Consignee Unavailable",
      remark: classification.remark || event.instructions || event.status,
      attemptCount: event.dispatchCount || shipment.attemptNumber || 1,
      status: "ACTION_REQUIRED",
      occurredAt: event.eventTime,
      metadata: JSON.stringify({
        rawEvent: event.rawPayload,
        supportsReattempt: classification.supportsReattempt,
        location: event.location,
      }),
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(shipmentAuditLogs).values({
      id: `sal_${nanoid(10)}`,
      shipmentId: shipment.id,
      orderId: shipment.orderId,
      adminName: "System Exception Engine",
      action: "NDR_RECOGNIZED",
      newState: JSON.stringify({
        exceptionId,
        providerCode: classification.providerCode,
        reason: classification.reason,
      }),
      notes: `Delivery NDR recognized from Delhivery code "${classification.providerCode}". Reason: ${classification.reason}`,
      createdAt: now,
    });

    return {
      processed: true,
      exceptionId,
      exceptionType: "DELIVERY_NDR",
      actionTaken: "Created new Delivery NDR exception",
    };
  }

  // 3. Process Pickup Exception Classification (e.g. EOD-777, EOD-21)
  if (classification.type === "PICKUP_EXCEPTION") {
    let shipmentCancelled = false;

    // Rule: EOD-777 and EOD-21 mark shipment status as Cancelled
    if (classification.setsCancelledStatus && shipment.status !== "cancelled") {
      await db
        .update(shipments)
        .set({
          status: "cancelled",
          cancelledAt: now,
          updatedAt: now,
        })
        .where(eq(shipments.id, shipment.id));
      shipmentCancelled = true;
    }

    const existingPickupEx = activeExceptions.find((e) => e.exceptionType === "PICKUP_EXCEPTION");
    if (!existingPickupEx) {
      const exceptionId = `ex_${nanoid(10)}`;
      await db.insert(shipmentExceptions).values({
        id: exceptionId,
        shipmentId: shipment.id,
        provider: shipment.provider,
        exceptionType: "PICKUP_EXCEPTION",
        providerCode: classification.providerCode || event.statusCode || "PICKUP_ERR",
        reason: classification.reason || "Pickup Exception",
        remark: classification.remark || event.instructions || event.status,
        attemptCount: event.dispatchCount || 1,
        status: "ACTION_REQUIRED",
        occurredAt: event.eventTime,
        metadata: JSON.stringify({
          rawEvent: event.rawPayload,
          setsCancelledStatus: classification.setsCancelledStatus,
        }),
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(shipmentAuditLogs).values({
        id: `sal_${nanoid(10)}`,
        shipmentId: shipment.id,
        orderId: shipment.orderId,
        adminName: "System Exception Engine",
        action: "PICKUP_EXCEPTION_RECOGNIZED",
        newState: JSON.stringify({
          exceptionId,
          code: classification.providerCode,
          shipmentCancelled,
        }),
        notes: `Pickup exception recognized (${classification.providerCode}). Shipment marked as cancelled: ${shipmentCancelled}`,
        createdAt: now,
      });

      return {
        processed: true,
        exceptionId,
        exceptionType: "PICKUP_EXCEPTION",
        actionTaken: "Created pickup exception record",
        shipmentCancelled,
      };
    }
  }

  // 4. Process RTO Exception Classification
  if (classification.type === "RTO") {
    // Carrier tracking RTO scans map to RTO_IN_TRANSIT (carrier reverse movement confirmed) or RETURNED_TO_ORIGIN (carrier completion confirmed)
    let rtoStatus: 'RTO_REQUESTED' | 'RTO_INITIATED' | 'RTO_IN_TRANSIT' | 'RETURNED_TO_ORIGIN' = "RTO_IN_TRANSIT";
    const statusText = event.status.toLowerCase();

    if (statusText.includes("returned to origin") || statusText.includes("returned")) {
      rtoStatus = "RETURNED_TO_ORIGIN";
    } else {
      rtoStatus = "RTO_IN_TRANSIT";
    }

    if (activeRTO) {
      await db
        .update(shipmentExceptions)
        .set({
          status: rtoStatus,
          remark: classification.remark || event.instructions || event.status,
          updatedAt: now,
        })
        .where(eq(shipmentExceptions.id, activeRTO.id));
    } else {
      const exceptionId = `ex_${nanoid(10)}`;
      await db.insert(shipmentExceptions).values({
        id: exceptionId,
        shipmentId: shipment.id,
        provider: shipment.provider,
        exceptionType: "RTO",
        providerCode: classification.providerCode || "RTO",
        reason: classification.reason || "Return to Origin",
        remark: classification.remark || event.instructions || event.status,
        attemptCount: event.dispatchCount || 1,
        status: rtoStatus,
        occurredAt: event.eventTime,
        metadata: JSON.stringify({ rawEvent: event.rawPayload }),
        createdAt: now,
        updatedAt: now,
      });
    }

    // Update shipment status to rto without moving Order status backwards
    if (shipment.status !== "rto" && shipment.status !== "delivered") {
      await db
        .update(shipments)
        .set({ status: "rto", updatedAt: now })
        .where(eq(shipments.id, shipment.id));
    }

    return {
      processed: true,
      exceptionType: "RTO",
      actionTaken: `Updated RTO status to ${rtoStatus}`,
    };
  }

  // 5. Process Unknown Carrier Exceptions (Unmapped Codes)
  if (classification.type === "UNKNOWN_EXCEPTION") {
    const existingUnknownEx = activeExceptions.find(
      (e) => e.exceptionType === "UNKNOWN_EXCEPTION" && e.providerCode === classification.providerCode
    );

    if (!existingUnknownEx) {
      const exceptionId = `ex_${nanoid(10)}`;
      await db.insert(shipmentExceptions).values({
        id: exceptionId,
        shipmentId: shipment.id,
        provider: shipment.provider,
        exceptionType: "UNKNOWN_EXCEPTION",
        providerCode: classification.providerCode,
        reason: classification.reason || "Unmapped Provider Code",
        remark: classification.remark || event.instructions || event.status,
        attemptCount: event.dispatchCount || 1,
        status: "ACTION_REQUIRED",
        occurredAt: event.eventTime,
        metadata: JSON.stringify({ rawEvent: event.rawPayload }),
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return {
    processed: true,
    actionTaken: `Processed normal/scan event: ${classification.type}`,
  };
}
