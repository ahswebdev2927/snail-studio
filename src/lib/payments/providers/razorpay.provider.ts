import { PaymentProvider } from "../payment-provider";
import { PaymentSession, PaymentVerificationResult, RefundResult } from "../types";

export class RazorpayProvider implements PaymentProvider {
  private gateway: PaymentProvider;

  constructor(gateway: PaymentProvider) {
    this.gateway = gateway;
  }

  async createPayment(orderId: string, amount: number): Promise<PaymentSession> {
    return this.gateway.createPayment(orderId, amount);
  }

  async verifyPayment(params: {
    paymentId: string;
    orderId?: string;
    gatewayOrderId?: string;
    signature?: string;
  }): Promise<PaymentVerificationResult> {
    return this.gateway.verifyPayment(params);
  }

  async refundPayment(paymentId: string, amount?: number): Promise<RefundResult> {
    return this.gateway.refundPayment(paymentId, amount);
  }
}
