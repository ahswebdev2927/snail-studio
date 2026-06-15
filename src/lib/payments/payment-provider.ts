import { PaymentSession, PaymentVerificationResult, RefundResult } from "./types";

export interface PaymentProvider {
  createPayment(orderId: string, amount: number): Promise<PaymentSession>;
  
  verifyPayment(params: {
    paymentId: string;
    orderId?: string;
    gatewayOrderId?: string;
    signature?: string;
  }): Promise<PaymentVerificationResult>;

  refundPayment(paymentId: string, amount?: number): Promise<RefundResult>;
}
