import { db } from "@/db";
import { shipments, trackingEvents, orderStatusHistory } from "@/db/schema";
import { eq, notInArray } from "drizzle-orm";
import { getShippingProvider } from "@/lib/shipping";
import { TrackingSyncResult } from "@/lib/shipping/types";
import { nanoid } from "nanoid";
import { updateOrderStatus } from "@/services/checkout/order.service";
import { sendMail } from "@/services/email/email.service";
import { getOrderStatusUpdateTemplate } from "@/services/email/templates/order-status-update.template";

/**
 * Resolves the admin email recipient address from environment settings.
 */
function getAdminEmail(): string {
  return (
    process.env.ADMIN_EMAIL ||
    process.env.STORE_NOTIFICATIONS_EMAIL ||
    process.env.SMTP_USER ||
    "admin@snailstudio.in"
  );
}

/**
 * Determines email recipients based on Phase V3-5 notification routing matrix:
 * - in_transit, out_for_delivery -> Customer ONLY
 * - delivered, ndr              -> BOTH Customer AND Admin
 * - rto                         -> Admin ONLY
 */
export function getNotificationRecipients(
  status: string,
  customerEmail?: string | null,
  adminEmail: string = getAdminEmail()
): string[] {
  const recipients: string[] = [];

  switch (status) {
    case "in_transit":
    case "out_for_delivery":
      if (customerEmail) recipients.push(customerEmail);
      break;

    case "delivered":
    case "ndr":
      if (customerEmail) recipients.push(customerEmail);
      if (adminEmail && !recipients.includes(adminEmail)) recipients.push(adminEmail);
      break;

    case "rto":
      if (adminEmail) recipients.push(adminEmail);
      break;

    default:
      break;
  }

  return recipients;
}

/**
 * Periodically polls tracking details for active shipments and syncs statuses atomically.
 * Optimized for cron-job.org execution constraints (max 30s timeout, max 64KB response).
 */
export async function syncActiveShipments(): Promise<TrackingSyncResult> {
  const startTime = Date.now();
  // 22-second execution ceiling to strictly respect cron-job.org 30-second timeout limit
  const MAX_EXECUTION_TIME_MS = 22000;

  // Terminal statuses that no longer need active tracking polling
  const terminalStatuses = ["delivered", "cancelled", "rto"];

  const activeShipments = await db.query.shipments.findMany({
    where: notInArray(shipments.status, terminalStatuses as any),
    with: {
      order: {
        with: { user: true },
      },
    },
  });

  let totalSynced = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const errors: Array<{ waybill: string; error: string }> = [];

  for (const shipment of activeShipments) {
    // Timeout guard check before starting next shipment
    if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
      console.warn(
        `[Tracking Sync] Execution time limit (${MAX_EXECUTION_TIME_MS}ms) reached. Skipping remaining ${
          activeShipments.length - totalSynced - skippedCount
        } active shipments for next cron cycle.`
      );
      skippedCount += activeShipments.length - (totalSynced + skippedCount);
      break;
    }

    const waybill = shipment.waybill || shipment.trackingNumber;

    if (!waybill) {
      skippedCount++;
      continue;
    }

    // Skip polling external couriers if no live tracking provider API is wired up
    if (shipment.provider === "external") {
      skippedCount++;
      continue;
    }

    totalSynced++;

    try {
      const provider = getShippingProvider(shipment.provider);
      const trackingRes = await provider.trackShipment(waybill);

      if (!trackingRes || !trackingRes.normalizedStatus) {
        continue;
      }

      const newStatus = trackingRes.normalizedStatus;
      const currentStatus = shipment.status;

      // 1. Sync scan events into database with composite key deduplication
      if (trackingRes.scans && trackingRes.scans.length > 0) {
        const existingEvents = await db.query.trackingEvents.findMany({
          where: eq(trackingEvents.shipmentId, shipment.id),
        });

        const existingKeys = new Set(
          existingEvents.map((e) => `${e.status}_${e.timestamp.getTime()}_${(e.location || "").trim()}`)
        );

        for (const scan of trackingRes.scans) {
          const scanTime = new Date(scan.timestamp).getTime();
          const scanLocation = (scan.location || "").trim();
          const scanKey = `${scan.status}_${scanTime}_${scanLocation}`;

          if (!existingKeys.has(scanKey)) {
            await db.insert(trackingEvents).values({
              id: `evt_${nanoid(10)}`,
              shipmentId: shipment.id,
              status: scan.status,
              location: scan.location || null,
              description: scan.description || `Scan event: ${scan.status}`,
              timestamp: new Date(scan.timestamp),
            });
            existingKeys.add(scanKey);
          }
        }
      }

      // 2. Process status transition updates
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

        if ((newStatus === "in_transit" || newStatus === "out_for_delivery") && !shipment.shippedAt) {
          updateData.shippedAt = now;
        }

        await db.update(shipments).set(updateData).where(eq(shipments.id, shipment.id));

        // 3. Cascade order status changes & record milestone history
        if (
          (newStatus === "in_transit" || newStatus === "out_for_delivery") &&
          shipment.order.status !== "shipped" &&
          shipment.order.status !== "delivered"
        ) {
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
            notes: `Tracking sync update: Package status is now ${newStatus}. Carrier: ${shipment.carrier}, Waybill: ${waybill}`,
            createdAt: now,
          });
        }

        // 4. Selective Email Notifications based on routing matrix
        const customerEmail = shipment.order.user?.email || null;
        const recipients = getNotificationRecipients(newStatus, customerEmail);

        if (recipients.length > 0) {
          const statusLabels: Record<string, string> = {
            in_transit: "In Transit",
            out_for_delivery: "Out for Delivery",
            delivered: "Delivered",
            ndr: "Delivery Attempt Exception (NDR)",
            rto: "Return to Origin (RTO)",
          };

          const statusLabel = statusLabels[newStatus] || newStatus;
          const html = getOrderStatusUpdateTemplate({
            customerName: shipment.order.user?.name || "Customer",
            orderId: shipment.orderId,
            newStatus: statusLabel,
            statusNotes: `Shipment status updated to ${statusLabel}. Carrier: ${shipment.carrier}, Tracking #: ${waybill}`,
            updatedAt: now,
          });

          await sendMail({
            to: recipients.length === 1 ? recipients[0] : recipients,
            subject: `Shipment Update: ${statusLabel} - Snail Studio (#${shipment.orderId})`,
            html,
            templateName: "order_status_update",
          });
        }
      }
    } catch (err: any) {
      failedCount++;
      console.error(`[Tracking Sync Error] Waybill ${waybill}:`, err);
      errors.push({ waybill, error: err.message || String(err) });
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    totalSynced,
    updatedCount,
    skippedCount,
    failedCount,
    durationMs,
    errors,
  };
}
