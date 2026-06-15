import { NextResponse } from "next/server";
import { confirmOrderPayment } from "@/services/payments/payment.service";

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
export async function POST(request: Request) {
  try {
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
