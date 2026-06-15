import Razorpay from "razorpay";
import crypto from "crypto";
import { PaymentProvider } from "../payment-provider";
import { PaymentSession, PaymentVerificationResult, RefundResult } from "../types";

export class RazorpayGateway implements PaymentProvider {
  private getClient(): Razorpay {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error("Razorpay API credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured.");
    }

    return new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
  }

  async createPayment(orderId: string, amount: number): Promise<PaymentSession> {
    const razorpay = this.getClient();
    
    try {
      const order = await razorpay.orders.create({
        amount: amount, // in paise
        currency: "INR",
        receipt: orderId,
        notes: {
          orderId: orderId
        }
      });

      return {
        id: order.id,
        orderId,
        amount: Number(order.amount),
        currency: order.currency,
        status: order.status,
        gateway: "razorpay",
        provider: "razorpay",
        gatewayOrderId: order.id,
        keyId: process.env.RAZORPAY_KEY_ID
      };
    } catch (error: any) {
      throw new Error(`Failed to create Razorpay payment order: ${error.message || error}`);
    }
  }

  async verifyPayment(params: {
    paymentId: string;
    orderId?: string;
    gatewayOrderId?: string;
    signature?: string;
  }): Promise<PaymentVerificationResult> {
    const { paymentId, gatewayOrderId, signature } = params;

    if (!paymentId || !gatewayOrderId || !signature) {
      return {
        success: false,
        status: "failed",
        amount: 0,
        currency: "INR",
        errorMessage: "Missing required parameters (paymentId, gatewayOrderId, signature) for Razorpay payment verification"
      };
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error("Razorpay secret key is not configured.");
    }

    try {
      // Standard signature verification:
      // hmac = HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, secret)
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${gatewayOrderId}|${paymentId}`)
        .digest("hex");

      if (expectedSignature !== signature) {
        return {
          success: false,
          status: "failed",
          amount: 0,
          currency: "INR",
          errorMessage: "Razorpay signature verification failed (signature mismatch)"
        };
      }

      // Retrieve the payment details to confirm status and amount
      const razorpay = this.getClient();
      const payment = await razorpay.payments.fetch(paymentId);

      // Statuses can be: created, authorized, captured, refunded, failed
      if (payment.status !== "captured") {
        return {
          success: false,
          gatewayTransactionId: paymentId,
          status: payment.status === "captured" ? "captured" : payment.status === "failed" ? "failed" : "pending",
          amount: Number(payment.amount),
          currency: payment.currency,
          errorMessage: `Razorpay payment status is ${payment.status}, expected captured.`
        };
      }

      return {
        success: true,
        gatewayTransactionId: paymentId,
        status: "captured",
        amount: Number(payment.amount),
        currency: payment.currency
      };
    } catch (error: any) {
      return {
        success: false,
        status: "failed",
        amount: 0,
        currency: "INR",
        errorMessage: `Razorpay payment verification exception: ${error.message || error}`
      };
    }
  }

  async refundPayment(paymentId: string, amount?: number): Promise<RefundResult> {
    const razorpay = this.getClient();

    try {
      const refundOptions: any = {};
      if (amount !== undefined) {
        refundOptions.amount = amount;
      }

      const refund = await razorpay.payments.refund(paymentId, refundOptions);

      return {
        success: true,
        gatewayRefundId: refund.id,
        status: refund.status === "processed" ? "processed" : "pending",
        amount: Number(refund.amount)
      };
    } catch (error: any) {
      return {
        success: false,
        status: "failed",
        amount: amount || 0,
        errorMessage: `Razorpay refund request exception: ${error.message || error}`
      };
    }
  }
}
