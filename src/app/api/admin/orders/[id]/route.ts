import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrderById, updateOrderStatus } from "@/services/checkout/order.service";
import { authorize } from "@/middleware/auth";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
  notes: z.string().max(500).optional().nullable(),
});

// GET /api/admin/orders/[id] - Fetch detailed order information (Admin only)
export async function GET(
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

    // Retrieve order using detailed service loader
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Also fetch associated payments
    const payments = await db.query.payments.findMany({
      where: (p, { eq }) => eq(p.orderId, orderId),
    });

    // Also fetch associated shipments with their events
    const shipments = await db.query.shipments.findMany({
      where: (s, { eq }) => eq(s.orderId, orderId),
      with: {
        events: {
          orderBy: (e, { desc }) => [desc(e.timestamp)],
        },
      },
    });

    return NextResponse.json({
      ...order,
      payments,
      shipments,
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/orders/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/orders/[id] - Update order status with log entry (Admin only)
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

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = patchSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status, notes } = result.data;

    // Check if order exists
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update status and write status history log
    await updateOrderStatus(orderId, status, notes || undefined);

    return NextResponse.json({
      success: true,
      message: `Order status successfully transitioned to ${status}`,
    }, { status: 200 });

  } catch (error: any) {
    console.error("PATCH /api/admin/orders/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
