import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyAndProcessReturnOnlinePayment } from "@/lib/returns/payment";
import { db } from "@/db";

// Mock DB and Payment Provider for unit test verification
vi.mock("@/db", () => ({
  db: {
    query: {
      returnRequests: {
        findFirst: vi.fn(),
      },
      payments: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue({}),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn().mockResolvedValue({}),
    })),
  },
}));

vi.mock("@/lib/payments/payment-factory", () => ({
  getPaymentProvider: vi.fn(() => ({
    createPayment: vi.fn().mockResolvedValue({
      id: "pay_order_test_99",
      gatewayOrderId: "order_rzp_test_99",
      gateway: "razorpay",
      amount: 12000,
      currency: "INR",
      paymentUrl: "https://razorpay.com/pay/pay_order_test_99",
    }),
    verifyPayment: vi.fn().mockResolvedValue({
      success: true,
      transactionId: "pay_rzp_txn_12345",
    }),
  })),
}));

describe("Phase V3-25: Razorpay Return & Replacement Payment Links Test Suite", () => {
  const mockReturnRequest = {
    id: "req_test_001",
    orderId: "ord_test_100",
    customerId: "usr_test_200",
    type: "REPLACEMENT" as const,
    reason: "Wrong Size",
    status: "APPROVED" as const,
    paymentResponsibility: "CUSTOMER_PAYS" as const,
    paymentAmount: 12000,
    paymentStatus: "PENDING" as const,
  };

  const mockPendingPayment = {
    id: "pmt_test_500",
    orderId: "ord_test_100",
    gateway: "razorpay",
    gatewayTransactionId: "order_rzp_test_99",
    purpose: "replacement_fee",
    status: "pending",
    amount: 12000,
    currency: "INR",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should process and verify online Razorpay payment for replacement fee successfully", async () => {
    (db.query.returnRequests.findFirst as any).mockResolvedValueOnce(mockReturnRequest);
    (db.query.payments.findFirst as any).mockResolvedValueOnce(mockPendingPayment);

    const result = await verifyAndProcessReturnOnlinePayment({
      requestId: mockReturnRequest.id,
      paymentId: "pay_rzp_txn_12345",
      gatewayOrderId: "order_rzp_test_99",
      signature: "test_valid_sig",
      userId: "usr_test_200",
    });

    expect(result.success).toBe(true);
    expect(result.returnRequest.paymentStatus).toBe("PAID");
    expect(result.returnRequest.paymentMethod).toBe("Razorpay");
    expect(result.returnRequest.paymentReference).toBe("pay_rzp_txn_12345");
  });

  it("should return early if return request is already recorded as PAID", async () => {
    const paidRequest = {
      ...mockReturnRequest,
      paymentStatus: "PAID" as const,
    };

    (db.query.returnRequests.findFirst as any).mockResolvedValueOnce(paidRequest);

    const result = await verifyAndProcessReturnOnlinePayment({
      requestId: mockReturnRequest.id,
      paymentId: "pay_rzp_txn_12345",
      gatewayOrderId: "order_rzp_test_99",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("already recorded as PAID");
  });

  it("should fail gracefully if pending payment record is not found", async () => {
    (db.query.returnRequests.findFirst as any).mockResolvedValueOnce(mockReturnRequest);
    (db.query.payments.findFirst as any).mockResolvedValueOnce(null);

    const result = await verifyAndProcessReturnOnlinePayment({
      requestId: mockReturnRequest.id,
      paymentId: "pay_rzp_txn_12345",
      gatewayOrderId: "non_existent_order",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Pending payment record not found");
  });
});
