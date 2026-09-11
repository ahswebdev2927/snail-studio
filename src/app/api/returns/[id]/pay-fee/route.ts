import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { returnRequests, payments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getPaymentProvider } from "@/lib/payments/payment-factory";
import { verifyAndProcessReturnOnlinePayment } from "@/lib/returns/payment";

const confirmFeeSchema = z.object({
  paymentId: z.string(),
  gatewayOrderId: z.string(),
  signature: z.string().optional(),
});

/**
 * GET /api/returns/[id]/pay-fee - Create/retrieve payment session for return/replacement fee
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

    const { id: requestId } = await params;
    if (!requestId) {
      return NextResponse.json({ error: "Return request ID is required" }, { status: 400 });
    }

    const returnReq = await db.query.returnRequests.findFirst({
      where: eq(returnRequests.id, requestId),
      with: {
        order: true,
      },
    });

    if (!returnReq) {
      return NextResponse.json({ error: "Return request not found" }, { status: 404 });
    }

    // Security check: Customer must own the order or be admin
    if (auth.user.role !== "admin" && returnReq.customerId !== auth.user.id && returnReq.order?.userId !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (returnReq.paymentResponsibility !== "CUSTOMER_PAYS" || returnReq.paymentStatus === "PAID") {
      return NextResponse.json({ error: "No pending payment required for this request." }, { status: 400 });
    }

    const provider = getPaymentProvider();
    const session = await provider.createPayment(returnReq.orderId, returnReq.paymentAmount);

    const paymentRecordId = `pmt_${nanoid(12)}`;
    const purpose = returnReq.type === "RETURN" ? "return_fee" : "replacement_fee";

    await db.insert(payments).values({
      id: paymentRecordId,
      orderId: returnReq.orderId,
      gateway: session.gateway,
      gatewayTransactionId: session.id,
      purpose,
      status: "pending",
      amount: session.amount,
      currency: session.currency,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      paymentSession: session,
      paymentRecordId,
      returnRequest: returnReq,
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/returns/[id]/pay-fee error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/returns/[id]/pay-fee - Confirm and verify Razorpay online payment for return fee
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

    const { id: requestId } = await params;
    if (!requestId) {
      return NextResponse.json({ error: "Return request ID is required" }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = confirmFeeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { paymentId, gatewayOrderId, signature } = validation.data;

    const result = await verifyAndProcessReturnOnlinePayment({
      requestId,
      paymentId,
      gatewayOrderId,
      signature,
      userId: auth.user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Payment verification failed" },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error("POST /api/returns/[id]/pay-fee error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
