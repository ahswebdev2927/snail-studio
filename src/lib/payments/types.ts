export interface PaymentSession {
  id: string; // Gateway order ID (e.g. order_mock_123 or order_rzp_123)
  orderId: string; // Internal application order ID
  amount: number; // Total amount in paise / INR subunit
  currency: string; // Currency e.g. "INR"
  status: string; // Session status e.g. "created"
  checkoutUrl?: string; // Redirect URL for mock checkout simulation
  gateway: "mock" | "razorpay";
  provider: "razorpay";
  gatewayOrderId?: string;
  keyId?: string; // Razorpay Key ID needed to open checkout modal on client
}

export interface PaymentVerificationResult {
  success: boolean;
  gatewayTransactionId?: string; // Gateway transaction payment ID (e.g. pay_xxx)
  status: "captured" | "failed" | "pending";
  amount: number;
  currency: string;
  errorMessage?: string;
}

export interface RefundResult {
  success: boolean;
  gatewayRefundId?: string; // Gateway refund ID (e.g. rfnd_xxx)
  status: "processed" | "failed" | "pending";
  amount: number;
  errorMessage?: string;
}
