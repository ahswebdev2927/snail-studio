import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { shipmentAuditLogs } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { authorize } from "@/middleware/auth";

// GET /api/admin/shipments/[id]/audit-logs - Retrieve audit log entries for shipment or order
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
      return NextResponse.json({ error: "Shipment ID or Order ID is required" }, { status: 400 });
    }

    const logs = await db.query.shipmentAuditLogs.findMany({
      where: or(
        eq(shipmentAuditLogs.shipmentId, id),
        eq(shipmentAuditLogs.orderId, id)
      ),
      orderBy: [desc(shipmentAuditLogs.createdAt)],
    });

    return NextResponse.json({
      success: true,
      auditLogs: logs,
    });
  } catch (error: any) {
    console.error("GET /api/admin/shipments/[id]/audit-logs error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
