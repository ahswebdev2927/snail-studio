import { describe, it, expect, vi, beforeEach } from "vitest";
import { recordReturnPayment } from "@/lib/returns/payment";
import { recordReturnPaymentSchema } from "@/lib/returns/types";
import { db } from "@/db";

// Mock DB queries for isolated unit testing
vi.mock("@/db", () => ({
  db: {
    query: {
      returnRequests: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
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

describe("Phase V3-24: Payment Matrix & Boundary Test Suite", () => {
  const mockAdminUser = {
    id: "usr_admin_pay",
    name: "Finance Admin",
    phoneNumber: "+919876543200",
    role: "admin" as const,
  };

  const pendingCustomerPaysRequest = {
    id: "ret_pay_matrix_01",
    orderId: "ord_pm_01",
    orderItemId: "item_pm_01",
    customerId: "usr_cust_01",
    type: "RETURN" as const,
    reason: "Wrong Size",
    customerNotes: "Testing payment matrix",
    status: "APPROVED" as const,
    adminNotes: null,
    waybill: null,
    trackingUrl: null,
    paymentResponsibility: "CUSTOMER_PAYS" as const,
    paymentAmount: 25000, // ₹250.00 stored in paise
    paymentStatus: "PENDING" as const,
    paymentMethod: null,
    paymentReference: null,
    paymentNotes: null,
    paidAt: null,
    recordedBy: null,
    createdAt: new Date("2026-09-09T10:00:00Z"),
    updatedAt: new Date("2026-09-09T10:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Zod Record Payment Input Validation", () => {
    it("should accept valid payment recording input", () => {
      const input = {
        paymentAmount: 25000,
        paymentMethod: "UPI",
        paymentReference: "UPI_REF_123456",
        paymentNotes: "Paid full amount",
      };
      const parseResult = recordReturnPaymentSchema.safeParse(input);
      expect(parseResult.success).toBe(true);
    });

    it("should reject non-positive amounts (zero or negative)", () => {
      const inputZero = {
        paymentAmount: 0,
        paymentMethod: "UPI",
        paymentReference: "REF_0",
      };
      expect(recordReturnPaymentSchema.safeParse(inputZero).success).toBe(false);

      const inputNegative = {
        paymentAmount: -500,
        paymentMethod: "UPI",
        paymentReference: "REF_NEG",
      };
      expect(recordReturnPaymentSchema.safeParse(inputNegative).success).toBe(false);
    });

    it("should reject invalid payment methods", () => {
      const inputInvalidMethod = {
        paymentAmount: 25000,
        paymentMethod: "BITCOIN",
        paymentReference: "REF_BTC",
      };
      expect(recordReturnPaymentSchema.safeParse(inputInvalidMethod).success).toBe(false);
    });

    it("should reject missing payment reference", () => {
      const inputMissingRef = {
        paymentAmount: 25000,
        paymentMethod: "UPI",
        paymentReference: "",
      };
      expect(recordReturnPaymentSchema.safeParse(inputMissingRef).success).toBe(false);
    });
  });

  describe("Payment Execution Boundary & Matrix Tests", () => {
    it("should successfully record exact payment amount matching paymentAmount", async () => {
      (db.query.returnRequests.findFirst as any).mockResolvedValueOnce(pendingCustomerPaysRequest);

      const result = await recordReturnPayment({
        requestId: pendingCustomerPaysRequest.id,
        paymentAmount: 25000,
        paymentMethod: "UPI",
        paymentReference: "UPI_EXACT_REF_100",
        paymentNotes: "Exact amount paid",
        adminUser: mockAdminUser,
      });

      expect(result.success).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });

    it("should reject recording zero or negative payment amount", async () => {
      (db.query.returnRequests.findFirst as any).mockResolvedValueOnce(pendingCustomerPaysRequest);

      const result = await recordReturnPayment({
        requestId: pendingCustomerPaysRequest.id,
        paymentAmount: 0,
        paymentMethod: "UPI",
        paymentReference: "UPI_ZERO_REF",
        adminUser: mockAdminUser,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Payment amount must be greater than zero");
    });

    it("should reject recording payment when request status is REJECTED", async () => {
      const rejectedRequest = {
        ...pendingCustomerPaysRequest,
        status: "REJECTED" as const,
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValueOnce(rejectedRequest);

      const result = await recordReturnPayment({
        requestId: rejectedRequest.id,
        paymentAmount: 25000,
        paymentMethod: "UPI",
        paymentReference: "REF_REJECTED",
        adminUser: mockAdminUser,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot record payment for a request with status REJECTED");
    });
  });
});
