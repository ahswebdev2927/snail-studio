import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderStatusHistory } from "@/db/schema";
import { eq } from "drizzle-orm";
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

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.shippingDifferenceStatus !== "pending") {
      return NextResponse.json({ error: "No pending shipping difference to waive." }, { status: 400 });
    }

    // Waive the difference: set status to waived
    await db.update(orders)
      .set({
        shippingDifferenceStatus: "waived",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    await db.insert(orderStatusHistory).values({
      id: `osh_${nanoid(10)}`,
      orderId,
      status: order.status,
      notes: `Shipping difference of ₹${(order.shippingDifference / 100).toFixed(2)} was waived by Admin (${auth.user.name}).`,
    });

    return NextResponse.json({
      success: true,
      message: "Shipping difference waived successfully.",
    }, { status: 200 });

  } catch (error: any) {
    console.error("POST /api/admin/orders/[id]/waive-difference error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
