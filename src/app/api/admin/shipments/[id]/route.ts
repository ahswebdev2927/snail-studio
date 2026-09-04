import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { shipments, orders, orderAddresses, trackingEvents, orderAddressHistory, shipmentAuditLogs } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { authorize } from "@/middleware/auth";

// GET /api/admin/shipments/[id] - Get detailed shipment view with tracking timeline and audit logs
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Shipment ID or Waybill is required" }, { status: 400 });
    }

    // Find shipment by ID, waybill, tracking number, or courier order ID
    const shipmentRecord = await db.query.shipments.findFirst({
      where: or(
        eq(shipments.id, id),
        eq(shipments.waybill, id),
        eq(shipments.trackingNumber, id),
        eq(shipments.courierOrderId, id)
      ),
    });

    if (!shipmentRecord) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    // Fetch related order
    const orderRecord = await db.query.orders.findFirst({
      where: eq(orders.id, shipmentRecord.orderId),
      with: {
        user: true,
        items: {
          with: { variant: true },
        },
        addresses: true,
        statusHistory: true,
      },
    });

    // Fetch tracking scan events
    const scans = await db.query.trackingEvents.findMany({
      where: eq(trackingEvents.shipmentId, shipmentRecord.id),
      orderBy: [desc(trackingEvents.timestamp)],
    });

    // Fetch address history if available
    const addressHistories = await db.query.orderAddressHistory.findMany({
      where: eq(orderAddressHistory.orderId, shipmentRecord.orderId),
      orderBy: [desc(orderAddressHistory.version)],
    });

    // Fetch shipment audit logs
    const auditLogs = await db.query.shipmentAuditLogs.findMany({
      where: or(
        eq(shipmentAuditLogs.shipmentId, shipmentRecord.id),
        eq(shipmentAuditLogs.orderId, shipmentRecord.orderId)
      ),
      orderBy: [desc(shipmentAuditLogs.createdAt)],
    });

    const shippingAddress = orderRecord?.addresses.find((a) => a.type === "shipping") || orderRecord?.addresses[0];

    return NextResponse.json({
      success: true,
      shipment: {
        ...shipmentRecord,
        customerName: shippingAddress?.name || orderRecord?.user?.name || "Guest Customer",
        customerPhone: shippingAddress?.phone || orderRecord?.user?.phoneNumber || "N/A",
        customerEmail: orderRecord?.user?.email || null,
        shippingAddress,
      },
      order: orderRecord || null,
      trackingEvents: scans,
      addressHistory: addressHistories,
      auditLogs,
    });
  } catch (error: any) {
    console.error("GET /api/admin/shipments/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
