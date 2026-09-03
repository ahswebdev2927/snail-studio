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
import { createOrderShipment, cancelOrderShipment } from "@/services/shipping/shipment-orchestration.service";

const createShipmentSchema = z.object({
  provider: z.enum(["delhivery", "external"]).default("delhivery"),
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  externalCourierName: z.string().optional(),
  externalTrackingUrl: z.string().optional(),
  externalMetadata: z.string().optional(),
  estimatedDeliveryAt: z.string().optional().nullable(),
  adminOptions: z.object({
    weightGrams: z.number().optional(),
    lengthCm: z.number().optional(),
    widthCm: z.number().optional(),
    heightCm: z.number().optional(),
    fragileShipment: z.boolean().optional(),
  }).optional(),
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
    "cancelled",
  ]),
  location: z.string().max(200).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

const cancelShipmentSchema = z.object({
  reason: z.string().min(3, "Cancellation reason must be at least 3 characters long"),
});

async function sendShipmentEmail(orderId: string, subject: string, newStatusLabel: string, notes?: string | null) {
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
    console.error(`[Shipment Email Trigger Error] Failed to send email for ${orderId}:`, err);
  }
}

// POST /api/admin/orders/[id]/shipment - Create / Generate Shipment
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

    const shipmentData = await createOrderShipment({
      orderId,
      provider: result.data.provider,
      carrier: result.data.carrier,
      trackingNumber: result.data.trackingNumber,
      externalCourierName: result.data.externalCourierName,
      externalTrackingUrl: result.data.externalTrackingUrl,
      externalMetadata: result.data.externalMetadata,
      estimatedDeliveryAt: result.data.estimatedDeliveryAt,
      adminOptions: result.data.adminOptions,
    });

    return NextResponse.json({
      success: true,
      message: "Shipment successfully generated",
      ...shipmentData,
    }, { status: 201 });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("POST /api/admin/orders/[id]/shipment error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create shipment" },
      { status: 400 }
    );
  }
}

// PATCH /api/admin/orders/[id]/shipment - Update Shipment Status
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

    const statusMap: Record<string, "pending" | "ready_to_ship" | "in_transit" | "out_for_delivery" | "delivered" | "ndr" | "cancelled" | "rto" | "manifested" | "pickup_scheduled" | "picked_up"> = {
      pickup_requested: "pickup_scheduled",
      pickup_scheduled: "pickup_scheduled",
      pickup_completed: "picked_up",
      in_transit: "in_transit",
      reached_destination_hub: "in_transit",
      out_for_delivery: "out_for_delivery",
      delivered: "delivered",
      delivery_attempted: "ndr",
      delivery_failed: "ndr",
      rto_initiated: "rto",
      rto_in_transit: "rto",
      rto_delivered: "rto",
      cancelled: "cancelled",
    };
    const targetStatus = statusMap[status] || "in_transit";
    const updateFields: { status: typeof targetStatus; updatedAt: Date; shippedAt?: Date } = { status: targetStatus, updatedAt: now };
    
    if (status === "pickup_completed" && !shipmentRecord.shippedAt) {
      updateFields.shippedAt = now;
    }

    await db.update(shipments).set(updateFields).where(eq(shipments.id, shipmentRecord.id));

    await db.insert(trackingEvents).values({
      id: `evt_${nanoid(10)}`,
      shipmentId: shipmentRecord.id,
      status,
      location: location || null,
      description: description || `Shipment status updated to ${status}.`,
      timestamp: now,
    });

    const noteText = description || `Shipment status updated to ${status}.`;

    if (status === "pickup_completed") {
      await updateOrderStatus(orderId, "shipped", `Order shipped via ${shipmentRecord.carrier}. Notes: ${noteText}`);
    } else if (status === "delivered") {
      await updateOrderStatus(orderId, "delivered", `Order delivered by ${shipmentRecord.carrier}. Notes: ${noteText}`);
    } else {
      await db.insert(orderStatusHistory).values({
        id: `osh_${nanoid(10)}`,
        orderId,
        status: status,
        notes: `Tracking update: ${noteText}${location ? ` (Location: ${location})` : ""}`,
        createdAt: now,
      });

      const labelMap: Record<string, string> = {
        pickup_requested: "Pickup Requested",
        pickup_scheduled: "Pickup Scheduled",
        in_transit: "In Transit",
        reached_destination_hub: "Reached Destination Hub",
        out_for_delivery: "Out for Delivery",
        delivery_attempted: "Delivery Attempted",
        delivery_failed: "Delivery Failed",
        rto_initiated: "Return to Origin (RTO) Initiated",
        cancelled: "Shipment Cancelled",
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

// DELETE /api/admin/orders/[id]/shipment - Cancel Shipment with mandatory admin reason & Delhivery eligibility check
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const { id: orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    let reason = "Admin cancelled shipment";
    try {
      const body = await req.json();
      const parseRes = cancelShipmentSchema.safeParse(body);
      if (parseRes.success) {
        reason = parseRes.data.reason;
      } else if (body?.reason) {
        reason = body.reason;
      }
    } catch {
      const urlReason = req.nextUrl.searchParams.get("reason");
      if (urlReason) reason = urlReason;
    }

    const { verifySensitiveAction, logAdminAudit } = await import("@/lib/auth/security");
    const securityCheck = await verifySensitiveAction(req, auth.user, "cancel_shipment", null);
    if (!securityCheck.verified) {
      return securityCheck.errorResponse!;
    }

    const cancelResult = await cancelOrderShipment({
      orderId,
      reason,
      adminId: auth.user.id,
      adminName: auth.user.name || auth.user.phoneNumber,
    });

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const browser = req.headers.get("user-agent") || "Unknown";

    await logAdminAudit({
      adminId: auth.user.id,
      adminName: auth.user.name || auth.user.phoneNumber,
      action: "cancel_shipment",
      targetUserId: null,
      verificationStatus: "verified",
      ipAddress,
      browser,
    });

    return NextResponse.json({
      success: true,
      message: cancelResult.message,
    }, { status: 200 });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("DELETE /api/admin/orders/[id]/shipment error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to cancel shipment" },
      { status: 400 }
    );
  }
}
