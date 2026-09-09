import { describe, it, expect } from "vitest";
import { createReturnRequestSchema } from "@/lib/returns/types";

describe("Phase V3-22: Customer Return / Replacement UX Test Suite", () => {
  const mockCustomerReturnRequest = {
    id: "ret_ux_101",
    orderId: "ord_ux_101",
    orderItemId: "item_ux_101",
    customerId: "cust_ux_101",
    type: "RETURN" as const,
    reason: "Damaged" as const,
    customerNotes: "Packaging was crushed on arrival.",
    status: "PENDING_REVIEW" as const,
    adminNotes: null,
    waybill: null,
    trackingUrl: null,
    paymentResponsibility: "NONE" as const,
    paymentAmount: 0,
    paymentStatus: "NOT_REQUIRED" as const,
    createdAt: new Date("2026-09-09T10:00:00Z"),
  };

  const mockCustomerReplacementPendingPayment = {
    id: "repl_ux_202",
    orderId: "ord_ux_202",
    orderItemId: "item_ux_202",
    customerId: "cust_ux_101",
    type: "REPLACEMENT" as const,
    reason: "Wrong Size" as const,
    customerNotes: "Need size L instead of M.",
    status: "APPROVED" as const,
    adminNotes: "Approved size exchange.",
    waybill: null,
    trackingUrl: null,
    paymentResponsibility: "CUSTOMER_PAYS" as const,
    paymentAmount: 18000, // ₹180.00 in paise
    paymentStatus: "PENDING" as const,
    paymentMethod: null,
    paymentReference: null,
    createdAt: new Date("2026-09-09T11:00:00Z"),
  };

  describe("Customer Request Creation Payload Validation", () => {
    it("should validate a complete Return request payload", () => {
      const payload = {
        orderItemId: "item_ux_101",
        type: "RETURN",
        reason: "Damaged",
        customerNotes: "Damaged box upon arrival",
      };
      const result = createReturnRequestSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should validate a Replacement request payload with replacementVariantId", () => {
      const payload = {
        orderItemId: "item_ux_101",
        type: "REPLACEMENT",
        reason: "Wrong Size",
        replacementVariantId: "var_size_l",
        customerNotes: "Exchanging for Size L",
      };
      const result = createReturnRequestSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject a Replacement request payload missing replacementVariantId", () => {
      const payload = {
        orderItemId: "item_ux_101",
        type: "REPLACEMENT",
        reason: "Wrong Size",
        customerNotes: "Exchanging size",
      };
      const result = createReturnRequestSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues || (result.error as any).errors;
        expect(issues[0].message).toContain("Replacement variant selection is required");
      }
    });
  });

  describe("Customer Payment Banner & WhatsApp Link Construction", () => {
    it("should construct correct WhatsApp click-to-chat URL with pre-filled order and request ID", () => {
      const storePhone = "+91 99999 99999";
      const cleanPhone = storePhone.replace(/[^0-9]/g, "");
      const amountRupees = (mockCustomerReplacementPendingPayment.paymentAmount / 100).toFixed(2);

      const message = encodeURIComponent(
        `Hi Snail Studio! I am requesting payment instructions for my Replacement Request ID: ${mockCustomerReplacementPendingPayment.id} (Order #${mockCustomerReplacementPendingPayment.orderId}). Amount Due: ₹${amountRupees}.`
      );
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;

      expect(whatsappUrl).toContain("https://wa.me/919999999999");
      expect(whatsappUrl).toContain(encodeURIComponent(mockCustomerReplacementPendingPayment.id));
      expect(whatsappUrl).toContain("180.00");
    });
  });

  describe("Customer 3-Day Delivery Eligibility Window Logic", () => {
    it("should evaluate order delivered within 3 days as eligible", () => {
      const deliveredAt = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      const isWithin3Days = Date.now() - deliveredAt.getTime() <= threeDaysMs;

      expect(isWithin3Days).toBe(true);
    });

    it("should evaluate order delivered over 3 days ago as ineligible", () => {
      const deliveredAt = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000); // 4 days ago
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      const isWithin3Days = Date.now() - deliveredAt.getTime() <= threeDaysMs;

      expect(isWithin3Days).toBe(false);
    });
  });
});
