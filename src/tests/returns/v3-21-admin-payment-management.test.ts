import { describe, it, expect, vi, beforeEach } from "vitest";
import { recordReturnPaymentSchema } from "@/lib/returns/types";
import { recordReturnPayment } from "@/lib/returns/payment";
import { createReturnReversePickup } from "@/lib/returns/reverse-pickup";
import { createReplacementReplShipment } from "@/lib/returns/replacement";
import { db } from "@/db";

// Mock DB queries for unit testing
vi.mock("@/db", () => ({
  db: {
    query: {
      returnRequests: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      orderAddresses: {
        findFirst: vi.fn(),
      },
      orderItems: {
        findFirst: vi.fn(),
      },
      productVariants: {
        findFirst: vi.fn(),
      },
      products: {
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

// Mock Delhivery provider calls
vi.mock("@/lib/shipping/providers/delhivery/reverse-pickup", () => ({
  createDelhiveryReversePickup: vi.fn().mockResolvedValue({
    success: true,
    waybill: "DELHIVERY_REV_9999",
    trackingUrl: "https://track.delhivery.com/DELHIVERY_REV_9999",
  }),
}));

vi.mock("@/lib/shipping/providers/delhivery/repl", () => ({
  createDelhiveryREPL: vi.fn().mockResolvedValue({
    success: true,
    waybill: "DELHIVERY_REPL_8888",
    trackingUrl: "https://track.delhivery.com/DELHIVERY_REPL_8888",
  }),
}));

describe("Phase V3-21: Admin Payment Management Test Suite", () => {
  const mockAdminUser = {
    id: "usr_admin_001",
    name: "Admin Manager",
    phoneNumber: "+919999999999",
    role: "admin" as const,
  };

  const mockApprovedCustomerPaysReturn = {
    id: "ret_pay_101",
    orderId: "ord_pay_101",
    orderItemId: "item_101",
    customerId: "usr_cust_101",
    type: "RETURN" as const,
    reason: "Wrong Size",
    customerNotes: "Size too small",
    status: "APPROVED" as const,
    adminNotes: null,
    waybill: null,
    trackingUrl: null,
    paymentResponsibility: "CUSTOMER_PAYS" as const,
    paymentAmount: 12000, // ₹120.00 stored in paise
    paymentStatus: "PENDING" as const,
    paymentMethod: null,
    paymentReference: null,
    paymentNotes: null,
    paidAt: null,
    recordedBy: null,
    createdAt: new Date("2026-09-09T10:00:00Z"),
    updatedAt: new Date("2026-09-09T10:00:00Z"),
  };

  const mockApprovedCustomerPaysReplacement = {
    ...mockApprovedCustomerPaysReturn,
    id: "repl_pay_202",
    type: "REPLACEMENT" as const,
    replacementProductId: "prod_1",
    replacementVariantId: "var_1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Zod Payload Validation", () => {
    it("should validate valid payment recording payload", () => {
      const payload = {
        paymentAmount: 15000,
        paymentMethod: "UPI",
        paymentReference: "UPI987654321",
        paymentNotes: "Customer paid standard replacement shipping.",
      };
      const result = recordReturnPaymentSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject payload with negative or zero payment amount", () => {
      const payload = {
        paymentAmount: 0,
        paymentMethod: "UPI",
        paymentReference: "UPI987654321",
      };
      const result = recordReturnPaymentSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("should reject payload with missing payment reference", () => {
      const payload = {
        paymentAmount: 12000,
        paymentMethod: "BANK_TRANSFER",
        paymentReference: "   ",
      };
      const result = recordReturnPaymentSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("recordReturnPayment Execution Logic", () => {
    it("should record payment and update request status to PAID", async () => {
      (db.query.returnRequests.findFirst as any).mockResolvedValue(mockApprovedCustomerPaysReturn);

      const result = await recordReturnPayment({
        requestId: mockApprovedCustomerPaysReturn.id,
        paymentAmount: 12000,
        paymentMethod: "UPI",
        paymentReference: "UPI987654321",
        paymentNotes: "UPI Payment Received",
        adminUser: mockAdminUser as any,
      });

      expect(result.success).toBe(true);
      expect(result.returnRequest).toBeDefined();
      expect(result.returnRequest.paymentStatus).toBe("PAID");
      expect(result.returnRequest.paymentAmount).toBe(12000);
      expect(result.returnRequest.paymentMethod).toBe("UPI");
      expect(result.returnRequest.paymentReference).toBe("UPI987654321");
      expect(result.returnRequest.recordedBy).toBe(mockAdminUser.id);
      expect(db.update).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });

    it("should fail when recording payment for non-existent request", async () => {
      (db.query.returnRequests.findFirst as any).mockResolvedValue(null);

      const result = await recordReturnPayment({
        requestId: "invalid_id",
        paymentAmount: 12000,
        paymentMethod: "UPI",
        paymentReference: "UPI123",
        adminUser: mockAdminUser as any,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(404);
    });

    it("should fail when recording payment on a REJECTED request", async () => {
      (db.query.returnRequests.findFirst as any).mockResolvedValue({
        ...mockApprovedCustomerPaysReturn,
        status: "REJECTED",
      });

      const result = await recordReturnPayment({
        requestId: mockApprovedCustomerPaysReturn.id,
        paymentAmount: 12000,
        paymentMethod: "UPI",
        paymentReference: "UPI123",
        adminUser: mockAdminUser as any,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
    });
  });

  describe("Payment Gate Enforcement for Delhivery Shipments", () => {
    it("should BLOCK Delhivery Reverse Pickup when customer payment is PENDING", async () => {
      (db.query.returnRequests.findFirst as any).mockResolvedValue(mockApprovedCustomerPaysReturn);

      const result = await createReturnReversePickup({
        requestId: mockApprovedCustomerPaysReturn.id,
        adminUser: mockAdminUser as any,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toContain("Customer payment of ₹120.00 is required");
    });

    it("should BLOCK Delhivery REPL Exchange when customer payment is PENDING", async () => {
      (db.query.returnRequests.findFirst as any).mockResolvedValue(mockApprovedCustomerPaysReplacement);

      const result = await createReplacementReplShipment({
        requestId: mockApprovedCustomerPaysReplacement.id,
        adminUser: mockAdminUser as any,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toContain("Customer payment of ₹120.00 is required");
    });

    it("should ALLOW Delhivery Reverse Pickup AFTER payment status is PAID", async () => {
      const paidReturnRequest = {
        ...mockApprovedCustomerPaysReturn,
        paymentStatus: "PAID" as const,
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValue(paidReturnRequest);
      (db.query.orderAddresses.findFirst as any).mockResolvedValue({
        name: "Customer Name",
        phone: "+919876543210",
        addressLine1: "123 Main Street",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        country: "India",
      });
      (db.query.orderItems.findFirst as any).mockResolvedValue({ quantity: 1 });

      const result = await createReturnReversePickup({
        requestId: paidReturnRequest.id,
        adminUser: mockAdminUser as any,
      });

      expect(result.success).toBe(true);
      expect(result.waybill).toBe("DELHIVERY_REV_9999");
    });
  });
});
