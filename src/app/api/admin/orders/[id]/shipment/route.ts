import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, shipments, trackingEvents, orderStatusHistory } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { nanoid } from "nanoid";
import { z } from "zod";
import { updateOrderStatus } from "@/services/checkout/order.service";
import { sendMail } from "@/services/email/email.service";
import { getOrderStatusUpdateTemplate } from "@/services/email/templates/order-status-update.template";
import { validatePreShipment } from "@/services/shipping/shipping-policy.service";

const createShipmentSchema = z.object({
  carrier: z.string().min(2).max(100),
  trackingNumber: z.string().min(3).max(100),
  estimatedDeliveryAt: z.string().optional().nullable(),
});

const updateShipmentSchema = z.object({
  status: z.enum([
    "pickup_requested",
    "pickup_scheduled",
    "pickup_completed",
    "in_transit",
    "reached_destination_hub",
    "out_for_delivery",
    "delivered",
    "delivery_attempted",
    "delivery_failed",
    "rto_initiated",
    "rto_in_transit",
    "rto_delivered",
    "cancelled"
  ]),
  location: z.string().max(200).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

// Helper to send specific custom shipment emails
async function sendShipmentEmail(orderId: string, subject: string, newStatusLabel: string, notes?: string | null) {
  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { user: true }
    });
    if (order && order.user?.email) {
      const html = getOrderStatusUpdateTemplate({
        customerName: order.user.name || "Customer",
        orderId: order.id,
        newStatus: newStatusLabel,
        statusNotes: notes || `Shipment update: ${newStatusLabel}`,
        updatedAt: new Date()
      });
      await sendMail({
        to: order.user.email,
        subject: `${subject} - Snail Studio (#${order.id})`,
        html,
        templateName: "order_status_update"
      });
    }
  } catch (err) {
    console.error(`[Shipment Email Trigger Error] Failed to send email for ${orderId}:`, err);
  }
}

// POST /api/admin/orders/[id]/shipment - Create / Generate Shipment (Assign Courier)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Verify order exists
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if shipment already exists
    const existingShipment = await db.query.shipments.findFirst({
      where: eq(shipments.orderId, orderId),
    });

    if (existingShipment) {
      return NextResponse.json(
        { error: "A shipment has already been created for this order" },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = createShipmentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Pre-Shipment Validation check
    const validation = await validatePreShipment(orderId);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Pre-shipment validation failed", reasons: validation.errors },
        { status: 400 }
      );
    }

    const { carrier, trackingNumber, estimatedDeliveryAt } = result.data;
    const shipmentId = `ship_${nanoid(10)}`;
    const now = new Date();
    const estDeliveryDate = estimatedDeliveryAt ? new Date(estimatedDeliveryAt) : null;

    // Run updates atomically in transaction
    await db.transaction(async (tx) => {
      // 1. Create the shipment record
      await tx.insert(shipments).values({
        id: shipmentId,
        orderId,
        carrier,
        trackingNumber,
        status: "ready_to_ship",
        shippedAt: null,
        estimatedDeliveryAt: estDeliveryDate,
      });

      // 2. Insert initial tracking event
      await tx.insert(trackingEvents).values({
        id: `evt_${nanoid(10)}`,
        shipmentId,
        status: "ready_to_ship",
        location: "Warehouse",
        description: `Waybill generated for courier ${carrier}. Tracking #: ${trackingNumber}.`,
        timestamp: now,
      });

      // 3. Log "ready_to_ship" in orderStatusHistory
      await tx.insert(orderStatusHistory).values({
        id: `osh_${nanoid(10)}`,
        orderId,
        status: "ready_to_ship",
        notes: `Shipment created with ${carrier} (Tracking #: ${trackingNumber}). Ready to ship.`,
        createdAt: now,
      });

      // 4. Update the order status record to processing and lock the address
      await tx.update(orders).set({
        status: "processing",
        addressLockedAt: now, // Address is locked after AWB generation
        updatedAt: now,
      }).where(eq(orders.id, orderId));
    });

    // 5. Send "Ready To Ship" / "Shipment Created" Email Notification
    await sendShipmentEmail(
      orderId,
      "Ready to Ship",
      "Ready to Ship",
      `Your package is packed and ready. Shipment created with ${carrier}. Tracking waybill number is ${trackingNumber}.`
    );

    return NextResponse.json({
      success: true,
      message: "Shipment successfully generated",
      shipmentId,
    }, { status: 201 });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/admin/orders/[id]/shipment error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message || String(error) },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/orders/[id]/shipment - Update Shipment Status (Add events & notes)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Verify shipment exists
    const shipmentRecord = await db.query.shipments.findFirst({
      where: eq(shipments.orderId, orderId),
    });

    if (!shipmentRecord) {
      return NextResponse.json({ error: "No shipment found for this order" }, { status: 404 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = updateShipmentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status, location, description } = result.data;
    const now = new Date();

    // 1. Update the shipment status
    const updateFields: { status: string; updatedAt: Date; shippedAt?: Date } = { status, updatedAt: now };
    
    // If status transitioned to pickup_completed or delivered, set relevant timestamps
    if (status === "pickup_completed" && !shipmentRecord.shippedAt) {
      updateFields.shippedAt = now;
    }

    await db.update(shipments).set(updateFields).where(eq(shipments.id, shipmentRecord.id));

    // 2. Insert the tracking event
    await db.insert(trackingEvents).values({
      id: `evt_${nanoid(10)}`,
      shipmentId: shipmentRecord.id,
      status,
      location: location || null,
      description: description || `Shipment status updated to ${status}.`,
      timestamp: now,
    });

    // 3. Cascade updates to order workflow if matching milestones
    const noteText = description || `Shipment status updated to ${status}.`;

    if (status === "pickup_completed") {
      // Cascade Order Status to 'shipped'
      await updateOrderStatus(orderId, "shipped", `Order shipped via ${shipmentRecord.carrier}. Notes: ${noteText}`);
    } else if (status === "delivered") {
      // Cascade Order Status to 'delivered'
      await updateOrderStatus(orderId, "delivered", `Order delivered by ${shipmentRecord.carrier}. Notes: ${noteText}`);
    } else {
      // Log custom tracking event into order status history and send email notification
      await db.insert(orderStatusHistory).values({
        id: `osh_${nanoid(10)}`,
        orderId,
        status: status,
        notes: `Tracking update: ${noteText}${location ? ` (Location: ${location})` : ""}`,
        createdAt: now,
      });

      // Send update email for events (Pickup Requested, In Transit, Out for Delivery, etc.)
      const labelMap: Record<string, string> = {
        pickup_requested: "Pickup Requested",
        pickup_scheduled: "Pickup Scheduled",
        in_transit: "In Transit",
        reached_destination_hub: "Reached Destination Hub",
        out_for_delivery: "Out for Delivery",
        delivery_attempted: "Delivery Attempted",
        delivery_failed: "Delivery Failed",
        rto_initiated: "Return to Origin (RTO) Initiated",
        cancelled: "Shipment Cancelled"
      };

      await sendShipmentEmail(
        orderId,
        labelMap[status] || status,
        labelMap[status] || status,
        `Your shipment status is now: ${labelMap[status] || status}. Location: ${location || "N/A"}. Description: ${noteText}`
      );
    }

    return NextResponse.json({
      success: true,
      message: "Shipment status successfully updated",
    }, { status: 200 });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("PATCH /api/admin/orders/[id]/shipment error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message || String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/orders/[id]/shipment - Cancel Shipment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Verify shipment exists
    const shipmentRecord = await db.query.shipments.findFirst({
      where: eq(shipments.orderId, orderId),
    });

    if (!shipmentRecord) {
      return NextResponse.json({ error: "No shipment found for this order" }, { status: 404 });
    }

    // Sensitive Action Re-Authentication Check
    const { verifySensitiveAction, logAdminAudit } = await import("@/lib/auth/security");
    const securityCheck = await verifySensitiveAction(req, auth.user!, "cancel_shipment", null);
    if (!securityCheck.verified) {
      return securityCheck.errorResponse!;
    }

    // Delete shipment (cascades to trackingEvents)
    await db.delete(shipments).where(eq(shipments.id, shipmentRecord.id));

    const now = new Date();

    // Log the cancellation to order status history
    await db.insert(orderStatusHistory).values({
      id: `osh_${nanoid(10)}`,
      orderId,
      status: "processing",
      notes: "Shipment cancelled. Order reverted back to general processing state.",
      createdAt: now,
    });

    // Send cancellation notification
    await sendShipmentEmail(
      orderId,
      "Shipment Cancelled",
      "Processing",
      "Your active parcel shipment has been cancelled by the administrator. Your order is reverted back to processing state."
    );

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const browser = req.headers.get("user-agent") || "Unknown";

    // Write to admin audit logs
    await logAdminAudit({
      adminId: auth.user!.id,
      adminName: auth.user!.name || auth.user!.phoneNumber,
      action: "cancel_shipment",
      targetUserId: null,
      verificationStatus: "verified",
      ipAddress,
      browser,
    });

    // Send confirmation email to acting admin
    const { sendMail } = await import("@/services/email/email.service");
    const { getPrivilegedActionEmailTemplate } = await import("@/services/email/templates/security.template");

    if (auth.user!.email) {
      const adminEmailHtml = getPrivilegedActionEmailTemplate(
        auth.user!.name || "Administrator",
        "Cancel Shipment",
        `Order ID: ${orderId}, Shipment ID: ${shipmentRecord.id}`,
        ipAddress,
        browser
      );
      await sendMail({
        to: auth.user!.email,
        subject: `[Security Alert] Successful Privileged Action - Snail Studio`,
        html: adminEmailHtml,
        templateName: "admin_privileged_action",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Shipment successfully cancelled and deleted",
    }, { status: 200 });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("DELETE /api/admin/orders/[id]/shipment error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message || String(error) },
      { status: 500 }
    );
  }
}
