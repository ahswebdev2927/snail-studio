import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, payments, orderStatusHistory } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getPaymentProvider } from "@/lib/payments/payment-factory";

const confirmDifferenceSchema = z.object({
  paymentId: z.string(), // Gateway transaction payment ID (e.g. pay_xxx)
  gatewayOrderId: z.string(), // Gateway order ID (e.g. order_xxx)
  signature: z.string().optional(),
});

/**
 * GET /api/orders/[id]/pay-difference - Create a payment session for the pending shipping difference
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req);
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

    // Verify ownership
    if (auth.user.role !== "admin" && order.userId !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const differenceToPay = order.shippingDifference - order.shippingDifferencePaid;

    if (differenceToPay <= 0 || order.shippingDifferenceStatus !== "pending") {
      return NextResponse.json({ error: "No pending shipping adjustment payment required for this order." }, { status: 400 });
    }

    // Instantiate provider and generate session
    const provider = getPaymentProvider();
    const session = await provider.createPayment(orderId, differenceToPay);

    // Record the transaction attempt in the database
    const paymentRecordId = `pmt_${nanoid(12)}`;
    await db.insert(payments).values({
      id: paymentRecordId,
      orderId: order.id,
      gateway: session.gateway,
      gatewayTransactionId: session.id, // Stores the gateway order ID temporarily
      status: "pending",
      amount: session.amount,
      currency: session.currency,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      paymentSession: session,
      paymentRecordId,
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/orders/[id]/pay-difference error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders/[id]/pay-difference - Confirm/capture the shipping difference payment
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req);
    if (!auth.authorized || !auth.user) {
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

    const validation = confirmDifferenceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { paymentId, gatewayOrderId, signature } = validation.data;

    const result = await db.transaction(async (tx) => {
      // 1. Fetch order
      const order = await tx.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });

      if (!order) {
        return { status: 404, data: { error: "Order not found" } };
      }

      // Verify ownership
      if (auth.user?.role !== "admin" && order.userId !== auth.user?.id) {
        return { status: 403, data: { error: "Forbidden" } };
      }

      // 2. Fetch pending payment record
      const paymentRecord = await tx.query.payments.findFirst({
        where: and(
          eq(payments.orderId, orderId),
          eq(payments.gatewayTransactionId, gatewayOrderId),
          eq(payments.status, "pending")
        ),
      });

      if (!paymentRecord) {
        return { status: 404, data: { error: "Pending payment record not found for this transaction" } };
      }

      // 3. Verify payment using gateway provider
      const provider = getPaymentProvider();
      const verification = await provider.verifyPayment({
        paymentId,
        orderId,
        gatewayOrderId,
        signature,
      });

      if (!verification.success) {
        return { status: 400, data: { error: "Payment verification failed" } };
      }

      // 4. Update payment record to succeeded
      await tx.update(payments)
        .set({
          status: "succeeded",
          gatewayTransactionId: paymentId,
        })
        .where(eq(payments.id, paymentRecord.id));

      // 5. Update order details: set shippingDifferencePaid and shippingDifferenceStatus to 'paid'
      const updatedDifferencePaid = order.shippingDifferencePaid + paymentRecord.amount;
      const isFullyPaid = updatedDifferencePaid >= order.shippingDifference;

      await tx.update(orders)
        .set({
          shippingDifferencePaid: updatedDifferencePaid,
          shippingDifferenceStatus: isFullyPaid ? "paid" : "pending",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      // 6. Log status history event
      await tx.insert(orderStatusHistory).values({
        id: `osh_${nanoid(10)}`,
        orderId,
        status: order.status,
        notes: `Additional shipping adjustment payment of ₹${(paymentRecord.amount / 100).toFixed(2)} received successfully.`,
      });

      return {
        status: 200,
        data: {
          success: true,
          message: "Shipping difference payment captured successfully.",
          isFullyPaid,
        },
      };
    });

    return NextResponse.json(result.data, { status: result.status });

  } catch (error: any) {
    console.error("POST /api/orders/[id]/pay-difference error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
