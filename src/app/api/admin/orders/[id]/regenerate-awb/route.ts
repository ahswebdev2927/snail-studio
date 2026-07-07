import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, shipments, trackingEvents, orderStatusHistory } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { nanoid } from "nanoid";

export async function POST(
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

    // Verify order exists
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Find active shipment
    const activeShipment = await db.query.shipments.findFirst({
      where: and(
        eq(shipments.orderId, orderId),
        ne(shipments.status, "cancelled")
      ),
    });

    if (!activeShipment) {
      return NextResponse.json({ error: "No active shipment found to regenerate AWB." }, { status: 400 });
    }

    const newShipmentId = `ship_${nanoid(10)}`;
    const newTrackingNumber = `TRK${nanoid(10).toUpperCase()}`;
    const now = new Date();

    await db.transaction(async (tx) => {
      // 1. Cancel active shipment
      await tx.update(shipments)
        .set({ status: "cancelled" })
        .where(eq(shipments.id, activeShipment.id));

      await tx.insert(trackingEvents).values({
        id: `evt_${nanoid(10)}`,
        shipmentId: activeShipment.id,
        status: "cancelled",
        location: "Warehouse",
        description: "Waybill cancelled by administrator.",
        timestamp: now,
      });

      // 2. Create new shipment
      await tx.insert(shipments).values({
        id: newShipmentId,
        orderId,
        carrier: activeShipment.carrier,
        trackingNumber: newTrackingNumber,
        status: "ready_to_ship",
        shippedAt: null,
        estimatedDeliveryAt: activeShipment.estimatedDeliveryAt,
      });

      await tx.insert(trackingEvents).values({
        id: `evt_${nanoid(10)}`,
        shipmentId: newShipmentId,
        status: "ready_to_ship",
        location: "Warehouse",
        description: `New airway bill generated manually by Admin. Courier: ${activeShipment.carrier}. Tracking #: ${newTrackingNumber}.`,
        timestamp: now,
      });

      await tx.insert(orderStatusHistory).values({
        id: `osh_${nanoid(10)}`,
        orderId,
        status: order.status,
        notes: `AWB manual regeneration: cancelled #${activeShipment.trackingNumber}, created #${newTrackingNumber} (${activeShipment.carrier}).`,
        createdAt: now,
      });
    });

    return NextResponse.json({
      success: true,
      message: "AWB regenerated successfully.",
      trackingNumber: newTrackingNumber,
    }, { status: 200 });

  } catch (error: any) {
    console.error("POST /api/admin/orders/[id]/regenerate-awb error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
