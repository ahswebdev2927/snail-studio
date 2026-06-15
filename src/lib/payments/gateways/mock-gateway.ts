import { nanoid } from "nanoid";
import { PaymentProvider } from "../payment-provider";
import { PaymentSession, PaymentVerificationResult, RefundResult } from "../types";

export class MockGateway implements PaymentProvider {
  async createPayment(orderId: string, amount: number): Promise<PaymentSession> {
    const gatewayOrderId = `order_mock_${nanoid(12)}`;
    return {
      id: gatewayOrderId,
      orderId,
      amount,
      currency: "INR",
      status: "created",
      checkoutUrl: `/checkout/mock-pay?orderId=${orderId}&gatewayOrderId=${gatewayOrderId}&amount=${amount}`,
      gateway: "mock",
      provider: "razorpay",
      gatewayOrderId
    };
  }

  async verifyPayment(params: {
    paymentId: string;
    orderId?: string;
    gatewayOrderId?: string;
    signature?: string;
  }): Promise<PaymentVerificationResult> {
    const isSuccess = params.paymentId.startsWith("pay_mock_") || params.signature === "mock_sig_success";

    if (isSuccess) {
      return {
        success: true,
        gatewayTransactionId: params.paymentId,
        status: "captured",
        amount: 0, // Amount verified (0 indicates it should be hydrated from the order record)
        currency: "INR"
      };
    }

    return {
      success: false,
      status: "failed",
      amount: 0,
      currency: "INR",
      errorMessage: "Mock verification signature mismatch or invalid payment status"
    };
  }

  async refundPayment(paymentId: string, amount?: number): Promise<RefundResult> {
    const gatewayRefundId = `rfnd_mock_${nanoid(12)}`;
    return {
      success: true,
      gatewayRefundId,
      status: "processed",
      amount: amount || 0
    };
  }
}
