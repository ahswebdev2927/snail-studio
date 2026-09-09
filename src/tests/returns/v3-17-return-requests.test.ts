import { describe, it, expect, vi, beforeEach } from "vitest";
import { RETURN_REASONS, createReturnRequestSchema } from "@/lib/returns/types";
import {
  validateReturnEligibility,
  RETURN_ELIGIBILITY_WINDOW_DAYS,
  RETURN_ELIGIBILITY_WINDOW_MS,
} from "@/lib/returns/validation";
import { db } from "@/db";

// Mock DB queries for isolated unit testing
vi.mock("@/db", () => ({
  db: {
    query: {
      orders: {
        findFirst: vi.fn(),
      },
      productVariants: {
        findFirst: vi.fn(),
      },
      returnRequests: {
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn().mockResolvedValue({}),
    })),
  },
}));

describe("Phase V3-17: Return & Replacement Request Foundation Test Suite", () => {
  const mockCustomerId = "usr_cust_123";
  const mockOtherCustomerId = "usr_cust_999";
  const mockOrderId = "ord_test_001";
  const mockOrderItemId = "item_001";
  const mockVariantId = "var_001";
  const mockProductId = "prod_001";

  const now = new Date("2026-09-09T12:00:00Z");
  const recentDeliveryDate = new Date("2026-09-08T12:00:00Z"); // 1 day ago
  const expiredDeliveryDate = new Date("2026-09-04T12:00:00Z"); // 5 days ago (> 3 days)

  const createMockOrder = (status = "delivered", userId = mockCustomerId, updatedAt = recentDeliveryDate, returnRequests: any[] = []) => ({
    id: mockOrderId,
    userId,
    status,
    updatedAt,
    items: [
      {
        id: mockOrderItemId,
        orderId: mockOrderId,
        variantId: mockVariantId,
        quantity: 1,
        price: 150000,
      },
    ],
    shipments: [
      {
        id: "ship_001",
        status: status === "delivered" ? "delivered" : "in_transit",
        updatedAt,
      },
    ],
    returnRequests,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- ZOD SCHEMA TESTS ---
  describe("Zod Payload Schema Validation", () => {
    it("should accept valid RETURN request input", () => {
      const input = {
        orderItemId: mockOrderItemId,
        type: "RETURN",
        reason: "Wrong Size",
        customerNotes: "Size M is too loose.",
      };
      const result = createReturnRequestSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept valid REPLACEMENT request input with replacement variant", () => {
      const input = {
        orderItemId: mockOrderItemId,
        type: "REPLACEMENT",
        reason: "Wrong Size",
        replacementVariantId: "var_002",
        customerNotes: "Requesting Size S instead.",
      };
      const result = createReturnRequestSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject REPLACEMENT request missing replacementVariantId", () => {
      const input = {
        orderItemId: mockOrderItemId,
        type: "REPLACEMENT",
        reason: "Wrong Size",
      };
      const result = createReturnRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues || (result.error as any).errors;
        expect(issues[0].message).toContain("Replacement variant selection is required");
      }
    });

    it("should reject invalid return reason", () => {
      const input = {
        orderItemId: mockOrderItemId,
        type: "RETURN",
        reason: "InvalidReasonValue",
      };
      const result = createReturnRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  // --- SERVER-SIDE ELIGIBILITY TESTS ---
  describe("Return Eligibility Rules", () => {
    it("Scenario 1: Should approve eligible return request within 3-day window", async () => {
      const mockOrder = createMockOrder("delivered", mockCustomerId, recentDeliveryDate);
      (db.query.orders.findFirst as any).mockResolvedValue(mockOrder);

      const result = await validateReturnEligibility(
        mockOrderId,
        mockOrderItemId,
        mockCustomerId,
        "RETURN",
        undefined,
        now
      );

      expect(result.eligible).toBe(true);
      expect(result.orderItem).toBeDefined();
    });

    it("Scenario 2: Should reject request if order is not in delivered status", async () => {
      const mockOrder = createMockOrder("shipped", mockCustomerId, recentDeliveryDate);
      (db.query.orders.findFirst as any).mockResolvedValue(mockOrder);

      const result = await validateReturnEligibility(
        mockOrderId,
        mockOrderItemId,
        mockCustomerId,
        "RETURN",
        undefined,
        now
      );

      expect(result.eligible).toBe(false);
      expect(result.error).toContain("delivered orders");
    });

    it("Scenario 3: Should reject request if customer does not own order", async () => {
      const mockOrder = createMockOrder("delivered", mockCustomerId, recentDeliveryDate);
      (db.query.orders.findFirst as any).mockResolvedValue(mockOrder);

      const result = await validateReturnEligibility(
        mockOrderId,
        mockOrderItemId,
        mockOtherCustomerId,
        "RETURN",
        undefined,
        now
      );

      expect(result.eligible).toBe(false);
      expect(result.error).toContain("not authorized");
    });

    it("Scenario 4: Should reject request if 3-day delivery window has expired", async () => {
      const mockOrder = createMockOrder("delivered", mockCustomerId, expiredDeliveryDate);
      (db.query.orders.findFirst as any).mockResolvedValue(mockOrder);

      const result = await validateReturnEligibility(
        mockOrderId,
        mockOrderItemId,
        mockCustomerId,
        "RETURN",
        undefined,
        now
      );

      expect(result.eligible).toBe(false);
      expect(result.error).toContain("within 3 days");
    });

    it("Scenario 5: Should reject duplicate request when an active PENDING_REVIEW request exists", async () => {
      const existingActiveReq = {
        id: "ret_001",
        orderItemId: mockOrderItemId,
        type: "RETURN",
        status: "PENDING_REVIEW",
      };
      const mockOrder = createMockOrder("delivered", mockCustomerId, recentDeliveryDate, [existingActiveReq]);
      (db.query.orders.findFirst as any).mockResolvedValue(mockOrder);

      const result = await validateReturnEligibility(
        mockOrderId,
        mockOrderItemId,
        mockCustomerId,
        "RETURN",
        undefined,
        now
      );

      expect(result.eligible).toBe(false);
      expect(result.error).toContain("active return request");
    });

    it("Scenario 6: Should allow new request if previous request was REJECTED", async () => {
      const existingRejectedReq = {
        id: "ret_001",
        orderItemId: mockOrderItemId,
        type: "RETURN",
        status: "REJECTED",
      };
      const mockOrder = createMockOrder("delivered", mockCustomerId, recentDeliveryDate, [existingRejectedReq]);
      (db.query.orders.findFirst as any).mockResolvedValue(mockOrder);

      const result = await validateReturnEligibility(
        mockOrderId,
        mockOrderItemId,
        mockCustomerId,
        "RETURN",
        undefined,
        now
      );

      expect(result.eligible).toBe(true);
    });

    it("Scenario 7: Should validate replacement variant existence for REPLACEMENT requests", async () => {
      const mockOrder = createMockOrder("delivered", mockCustomerId, recentDeliveryDate);
      (db.query.orders.findFirst as any).mockResolvedValue(mockOrder);
      (db.query.productVariants.findFirst as any).mockResolvedValue({ id: "var_002", productId: mockProductId });

      const result = await validateReturnEligibility(
        mockOrderId,
        mockOrderItemId,
        mockCustomerId,
        "REPLACEMENT",
        "var_002",
        now
      );

      expect(result.eligible).toBe(true);
    });
  });
});
