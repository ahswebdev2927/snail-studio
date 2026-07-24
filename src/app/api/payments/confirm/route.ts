import { NextRequest, NextResponse } from "next/server";
import { confirmOrderPayment } from "@/services/payments/payment.service";
import { rateLimitRequest } from "@/lib/security/rate-limit";

/**
 * API Route Handler for confirming payments: POST /api/payments/confirm
 * 
 * Expectations:
 * - orderId: string (internal app order ID)
 * - paymentId: string (gateway transaction payment ID)
 * - gatewayOrderId: string (optional gateway order ID, resolved from database if omitted)
 * - signature: string (optional signature, required for production verification)
 * - cartId: string (optional cart ID, used to clear purchase history)
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 payment confirmations per 1 minute
    const limitResult = await rateLimitRequest(request, "payment:confirm", 10, 60 * 1000);
    if (!limitResult.success) {
      return NextResponse.json(
        { success: false, error: "Too many payment confirmation requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(limitResult.reset / 1000).toString(),
          },
        }
      );
    }

    const body = await request.json();
    const { orderId, paymentId, gatewayOrderId, signature, cartId } = body;

    if (!orderId || !paymentId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters: 'orderId' and 'paymentId' are required." },
        { status: 400 }
      );
    }

    const result = await confirmOrderPayment({
      orderId,
      paymentId,
      gatewayOrderId: gatewayOrderId || undefined,
      signature: signature || undefined,
      cartId: cartId || undefined
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "An error occurred during payment confirmation." },
      { status: 500 }
    );
  }
}
