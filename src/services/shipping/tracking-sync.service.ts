import { db } from "@/db";
import { orders, shipments, trackingEvents, orderStatusHistory } from "@/db/schema";
import { eq, and, notInArray } from "drizzle-orm";
import { getShippingProvider } from "@/lib/shipping";
import { TrackingSyncResult } from "@/lib/shipping/types";
import { nanoid } from "nanoid";
import { updateOrderStatus } from "@/services/checkout/order.service";
import { sendMail } from "@/services/email/email.service";
import { getOrderStatusUpdateTemplate } from "@/services/email/templates/order-status-update.template";

/**
 * Periodically polls tracking details for active shipments and syncs statuses atomically.
 */
export async function syncActiveShipments(): Promise<TrackingSyncResult> {
  // Terminal statuses that no longer need active tracking polling
  const terminalStatuses = ["delivered", "cancelled", "rto"];

  const activeShipments = await db.query.shipments.findMany({
    where: notInArray(shipments.status, terminalStatuses),
    with: {
      order: {
        with: { user: true },
      },
    },
  });

  let totalSynced = 0;
  let updatedCount = 0;
  const errors: Array<{ waybill: string; error: string }> = [];

  for (const shipment of activeShipments) {
    totalSynced++;
    const waybill = shipment.waybill || shipment.trackingNumber;

    if (!waybill) continue;

    // Skip polling external couriers if no live tracking provider API is wired up
    if (shipment.provider === "external") {
      continue;
    }

    try {
      const provider = getShippingProvider(shipment.provider);
      const trackingRes = await provider.trackShipment(waybill);

      if (!trackingRes || !trackingRes.normalizedStatus) {
        continue;
      }

      const newStatus = trackingRes.normalizedStatus;
      const currentStatus = shipment.status;

      // Sync scan events into database
      if (trackingRes.scans && trackingRes.scans.length > 0) {
        const existingEvents = await db.query.trackingEvents.findMany({
          where: eq(trackingEvents.shipmentId, shipment.id),
        });

        const existingKeys = new Set(
          existingEvents.map((e) => `${e.status}_${e.timestamp.getTime()}`)
        );

        for (const scan of trackingRes.scans) {
          const scanKey = `${scan.status}_${new Date(scan.timestamp).getTime()}`;
          if (!existingKeys.has(scanKey)) {
            await db.insert(trackingEvents).values({
              id: `evt_${nanoid(10)}`,
              shipmentId: shipment.id,
              status: scan.status,
              location: scan.location || null,
              description: scan.description || `Scan event: ${scan.status}`,
              timestamp: new Date(scan.timestamp),
            });
          }
        }
      }

      // Check if status changed
      if (newStatus !== currentStatus) {
        updatedCount++;
        const now = new Date();

        const updateData: {
          status: typeof newStatus;
          updatedAt: Date;
          shippedAt?: Date;
        } = {
          status: newStatus,
          updatedAt: now,
        };

        if (newStatus === "in_transit" || newStatus === "out_for_delivery") {
          if (!shipment.shippedAt) {
            updateData.shippedAt = now;
          }
        }

        await db.update(shipments).set(updateData).where(eq(shipments.id, shipment.id));

        // Cascade order status changes
        if ((newStatus === "in_transit" || newStatus === "out_for_delivery") && shipment.order.status !== "shipped" && shipment.order.status !== "delivered") {
          await updateOrderStatus(
            shipment.orderId,
            "shipped",
            `Automatic sync: Package in transit via ${shipment.carrier}. Tracking #: ${waybill}`
          );
        } else if (newStatus === "delivered" && shipment.order.status !== "delivered") {
          await updateOrderStatus(
            shipment.orderId,
            "delivered",
            `Automatic sync: Package delivered by ${shipment.carrier}. Tracking #: ${waybill}`
          );
        } else {
          // Record milestone event in orderStatusHistory
          await db.insert(orderStatusHistory).values({
            id: `osh_${nanoid(10)}`,
            orderId: shipment.orderId,
            status: newStatus,
            notes: `Tracking sync update: Package status is now ${newStatus}.`,
            createdAt: now,
          });
        }

        // Send email notification on milestone
        if (shipment.order.user?.email) {
          const statusLabels: Record<string, string> = {
            in_transit: "In Transit",
            out_for_delivery: "Out for Delivery",
            delivered: "Delivered",
            ndr: "Delivery Attempt Exception (NDR)",
            rto: "Return to Origin (RTO)",
          };

          const statusLabel = statusLabels[newStatus] || newStatus;
          const html = getOrderStatusUpdateTemplate({
            customerName: shipment.order.user.name || "Customer",
            orderId: shipment.orderId,
            newStatus: statusLabel,
            statusNotes: `Your package status is updated to ${statusLabel}. Carrier: ${shipment.carrier}, Tracking #: ${waybill}`,
            updatedAt: now,
          });

          await sendMail({
            to: shipment.order.user.email,
            subject: `Shipment Update: ${statusLabel} - Snail Studio (#${shipment.orderId})`,
            html,
            templateName: "order_status_update",
          });
        }
      }
    } catch (err: any) {
      console.error(`[Tracking Sync Error] Waybill ${waybill}:`, err);
      errors.push({ waybill, error: err.message || String(err) });
    }
  }

  return {
    totalSynced,
    updatedCount,
    errors,
  };
}
