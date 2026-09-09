import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  approveReturnRequestSchema,
  rejectReturnRequestSchema,
} from "@/lib/returns/types";
import { reviewReturnRequest } from "@/lib/returns/admin";
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

describe("Phase V3-18: Admin Return Approval Test Suite", () => {
  const mockAdminUser = {
    id: "usr_admin_001",
    name: "Admin User",
    phoneNumber: "+919999999999",
    role: "admin" as const,
  };

  const mockNonAdminUser = {
    id: "usr_cust_001",
    name: "Customer User",
    phoneNumber: "+918888888888",
    role: "customer" as const,
  };

  const mockRequestId = "ret_test_123";
  const mockOrderId = "ord_test_456";

  const mockPendingReturnRequest = {
    id: mockRequestId,
    orderId: mockOrderId,
    orderItemId: "item_001",
    customerId: "usr_cust_001",
    type: "RETURN" as const,
    reason: "Wrong Size",
    customerNotes: "Selected size M by mistake.",
    status: "PENDING_REVIEW" as const,
    adminNotes: null,
    paymentResponsibility: "NONE" as const,
    paymentAmount: 0,
    paymentStatus: "NOT_REQUIRED" as const,
    createdAt: new Date("2026-09-09T10:00:00Z"),
    updatedAt: new Date("2026-09-09T10:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- ZOD SCHEMA TESTS ---
  describe("Zod Payload Validation", () => {
    it("should validate valid approval payload with payment responsibility", () => {
      const payload = {
        paymentResponsibility: "CUSTOMER_PAYS",
        adminNotes: "Customer agreed to return shipping fee.",
      };
      const result = approveReturnRequestSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject approval payload missing payment responsibility", () => {
      const payload = {
        adminNotes: "Missing payment responsibility choice.",
      };
      const result = approveReturnRequestSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("should validate rejection payload with non-empty admin notes", () => {
      const payload = {
        adminNotes: "Item was returned beyond 30 days and shows signs of use.",
      };
      const result = rejectReturnRequestSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject rejection payload with missing or empty admin notes", () => {
      const payload = {
        adminNotes: "   ",
      };
      const result = rejectReturnRequestSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues || (result.error as any).errors;
        expect(issues[0].message).toContain("rejection notes are required");
      }
    });
  });

  // --- ADMIN REVIEW LOGIC TESTS ---
  describe("reviewReturnRequest Execution Logic", () => {
    it("Scenario 1: Should approve return request when valid options are provided", async () => {
      (db.query.returnRequests.findFirst as any).mockResolvedValue(mockPendingReturnRequest);

      const result = await reviewReturnRequest({
        requestId: mockRequestId,
        action: "APPROVE",
        paymentResponsibility: "CUSTOMER_PAYS",
        adminNotes: "Approved return. Customer pays pickup fee.",
        adminUser: mockAdminUser as any,
      });

      expect(result.success).toBe(true);
      expect(result.returnRequest).toBeDefined();
      expect(result.returnRequest.status).toBe("APPROVED");
      expect(result.returnRequest.paymentResponsibility).toBe("CUSTOMER_PAYS");
      expect(result.returnRequest.paymentStatus).toBe("PENDING");
      expect(result.returnRequest.reviewedBy).toBe(mockAdminUser.id);
      expect(db.update).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });

    it("Scenario 2: Should set paymentStatus to NOT_REQUIRED when paymentResponsibility is NONE", async () => {
      (db.query.returnRequests.findFirst as any).mockResolvedValue(mockPendingReturnRequest);

      const result = await reviewReturnRequest({
        requestId: mockRequestId,
        action: "APPROVE",
        paymentResponsibility: "NONE",
        adminNotes: "Free return provided.",
        adminUser: mockAdminUser as any,
      });

      expect(result.success).toBe(true);
      expect(result.returnRequest.paymentResponsibility).toBe("NONE");
      expect(result.returnRequest.paymentStatus).toBe("NOT_REQUIRED");
    });

    it("Scenario 3: Should reject return request when mandatory admin notes are supplied", async () => {
      (db.query.returnRequests.findFirst as any).mockResolvedValue(mockPendingReturnRequest);

      const result = await reviewReturnRequest({
        requestId: mockRequestId,
        action: "REJECT",
        adminNotes: "Rejected due to altered tags.",
        adminUser: mockAdminUser as any,
      });

      expect(result.success).toBe(true);
      expect(result.returnRequest.status).toBe("REJECTED");
      expect(result.returnRequest.adminNotes).toBe("Rejected due to altered tags.");
      expect(result.returnRequest.reviewedBy).toBe(mockAdminUser.id);
      expect(db.update).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });

    it("Scenario 4: Should fail rejection if admin notes are missing or empty", async () => {
      (db.query.returnRequests.findFirst as any).mockResolvedValue(mockPendingReturnRequest);

      const result = await reviewReturnRequest({
        requestId: mockRequestId,
        action: "REJECT",
        adminNotes: "   ",
        adminUser: mockAdminUser as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("rejection notes are required");
    });

    it("Scenario 5: Should prevent double-review on an already APPROVED request", async () => {
      const approvedRequest = {
        ...mockPendingReturnRequest,
        status: "APPROVED",
      };
      (db.query.returnRequests.findFirst as any).mockResolvedValue(approvedRequest);

      const result = await reviewReturnRequest({
        requestId: mockRequestId,
        action: "APPROVE",
        paymentResponsibility: "STORE_PAYS",
        adminUser: mockAdminUser as any,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toContain("cannot be modified");
    });

    it("Scenario 6: Should prevent review on a non-existent return request ID", async () => {
      (db.query.returnRequests.findFirst as any).mockResolvedValue(null);

      const result = await reviewReturnRequest({
        requestId: "non_existent_id",
        action: "APPROVE",
        paymentResponsibility: "NONE",
        adminUser: mockAdminUser as any,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error).toContain("not found");
    });
  });
});
