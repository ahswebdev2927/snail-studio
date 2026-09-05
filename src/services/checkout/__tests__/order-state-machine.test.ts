// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  validateOrderTransition,
  cancelAndRefundOrder,
  ALLOWED_ORDER_TRANSITIONS,
} from "../order.service";

// Mock schema
vi.mock("@/db/schema", () => ({
  orders: { id: "id" },
  orderItems: { id: "id" },
  orderAddresses: { id: "id" },
  orderStatusHistory: { id: "id" },
  shipments: { id: "id" },
  shipmentAuditLogs: { id: "id" },
  refunds: { id: "id" },
  users: { id: "id" },
}));

// Mock email service
vi.mock("@/services/email/email.service", () => ({
  sendMail: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/services/email/templates/order-confirmation.template", () => ({
  getOrderConfirmationTemplate: vi.fn().mockReturnValue("<html></html>"),
}));
vi.mock("@/services/email/templates/order-status-update.template", () => ({
  getOrderStatusUpdateTemplate: vi.fn().mockReturnValue("<html></html>"),
}));

// Mock coupon service
vi.mock("../coupon-engine.service", () => ({
  releaseCouponReservation: vi.fn().mockResolvedValue(true),
}));

// Mock DB
vi.mock("@/db", () => ({
  db: {
    query: {
      orders: {
        findFirst: vi.fn(),
      },
      shipments: {
        findFirst: vi.fn(),
      },
      payments: {
        findMany: vi.fn(),
      },
    },
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(true),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(true),
    }),
  },
}));

import { db } from "@/db";

describe("Phase V3-4: Order Fulfilment State Machine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateOrderTransition", () => {
    it("should allow valid sequential transitions", () => {
      expect(validateOrderTransition("pending", "confirmed").valid).toBe(true);
      expect(validateOrderTransition("confirmed", "processing").valid).toBe(true);
      expect(validateOrderTransition("processing", "ready_to_ship").valid).toBe(true);
      expect(validateOrderTransition("ready_to_ship", "cancelled").valid).toBe(true);
    });

    it("should block manual transition to 'shipped' or 'delivered'", () => {
      const shippedAttempt = validateOrderTransition("ready_to_ship", "shipped");
      expect(shippedAttempt.valid).toBe(false);
      expect(shippedAttempt.reason).toContain("Logistics states ('shipped', 'delivered') are updated automatically");

      const deliveredAttempt = validateOrderTransition("shipped", "delivered");
      expect(deliveredAttempt.valid).toBe(false);
      expect(deliveredAttempt.reason).toContain("Logistics states ('shipped', 'delivered') are updated automatically");
    });

    it("should allow transition to 'shipped' or 'delivered' when isLogisticsEvent flag is true", () => {
      expect(validateOrderTransition("ready_to_ship", "shipped", { isLogisticsEvent: true }).valid).toBe(true);
      expect(validateOrderTransition("shipped", "delivered", { isLogisticsEvent: true }).valid).toBe(true);
    });

    it("should block arbitrary state jumps", () => {
      const res = validateOrderTransition("processing", "delivered", { isLogisticsEvent: true });
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("Arbitrary state jumps are blocked");
    });

    it("should block transition from terminal states", () => {
      expect(validateOrderTransition("delivered", "cancelled").valid).toBe(false);
      expect(validateOrderTransition("refunded", "processing").valid).toBe(false);
    });
  });

  describe("cancelAndRefundOrder", () => {
    it("should reject cancellation if order is in status 'shipped' or 'delivered'", async () => {
      (db.query.orders.findFirst as any).mockResolvedValue({
        id: "ord_100",
        status: "shipped",
        totalAmount: 10000,
        payments: [],
      });

      await expect(
        cancelAndRefundOrder({
          orderId: "ord_100",
          reason: "Customer requested cancellation",
          refundType: "full",
          adminId: "adm_1",
        })
      ).rejects.toThrow("Cancellation is permitted only prior to dispatch");
    });

    it("should process 100% full refund correctly and set status to 'refunded'", async () => {
      (db.query.orders.findFirst as any).mockResolvedValue({
        id: "ord_101",
        status: "processing",
        totalAmount: 15000, // ₹150.00
        payments: [{ id: "pmt_1", status: "succeeded" }],
      });

      const res = await cancelAndRefundOrder({
        orderId: "ord_101",
        reason: "Out of stock item",
        refundType: "full",
        adminId: "adm_1",
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe("refunded");
      expect(res.refundAmountPaise).toBe(15000);
      expect(res.refundPercentage).toBe(100);
    });

    it("should process custom partial refund correctly and set status to 'partially_refunded'", async () => {
      (db.query.orders.findFirst as any).mockResolvedValue({
        id: "ord_102",
        status: "confirmed",
        totalAmount: 20000, // ₹200.00
        payments: [{ id: "pmt_2", status: "succeeded" }],
      });

      const res = await cancelAndRefundOrder({
        orderId: "ord_102",
        reason: "Partial item damage",
        refundType: "custom",
        refundAmountPaise: 10000, // ₹100.00 (50%)
        adminId: "adm_1",
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe("partially_refunded");
      expect(res.refundAmountPaise).toBe(10000);
      expect(res.refundPercentage).toBe(50);
    });

    it("should reject custom refund if amount exceeds total order amount", async () => {
      (db.query.orders.findFirst as any).mockResolvedValue({
        id: "ord_103",
        status: "processing",
        totalAmount: 10000, // ₹100.00
        payments: [],
      });

      await expect(
        cancelAndRefundOrder({
          orderId: "ord_103",
          reason: "Customer complaint",
          refundType: "custom",
          refundAmountPaise: 15000, // ₹150.00 (> ₹100)
          adminId: "adm_1",
        })
      ).rejects.toThrow("cannot exceed total order amount");
    });
  });
});
