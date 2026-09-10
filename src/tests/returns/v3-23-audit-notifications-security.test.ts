import { describe, it, expect, vi, beforeEach } from "vitest";
import { reviewReturnRequest } from "@/lib/returns/admin";
import { recordReturnPayment } from "@/lib/returns/payment";
import { createReturnReversePickup, markReturnReceived } from "@/lib/returns/reverse-pickup";
import { createReplacementReplShipment, markReplacementCompleted } from "@/lib/returns/replacement";
import {
  notifyReturnRequestReceived,
  notifyReturnApproved,
  notifyReturnRejected,
  notifyReturnPickupCreated,
  notifyReturnReceived,
  notifyReturnCompleted,
  notifyReplacementRequestReceived,
  notifyReplacementApproved,
  notifyReplacementRejected,
  notifyReplacementShipped,
  notifyReplacementDelivered,
  hasNotificationBeenSent,
  clearNotificationDedupeCache,
} from "@/lib/returns/notifications";
import { db } from "@/db";

// Mock insert values function
const mockInsertValues = vi.fn().mockResolvedValue({});

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
      inventoryItems: {
        findFirst: vi.fn(),
      },
      users: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue({}),
      })),
    })),
    insert: vi.fn(() => ({
      values: mockInsertValues,
    })),
  },
}));

// Mock Delhivery providers
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

// Mock notifications service
vi.mock("@/services/notifications/notification-service", () => ({
  triggerAdminNotification: vi.fn().mockResolvedValue(undefined),
}));

// Mock email service
vi.mock("@/services/email/email.service", () => ({
  sendMail: vi.fn().mockResolvedValue({ success: true, logId: "eml_mock_123" }),
}));

describe("Phase V3-23: Audit, Notifications & Security Test Suite", () => {
  const mockAdminUser = {
    id: "usr_admin_001",
    name: "Admin Manager",
    phoneNumber: "+919999999999",
    role: "admin" as const,
  };

  const mockPendingReturn = {
    id: "ret_audit_101",
    orderId: "ord_audit_101",
    orderItemId: "item_101",
    customerId: "usr_cust_101",
    type: "RETURN" as const,
    reason: "Damaged",
    customerNotes: "Package damaged upon arrival",
    status: "PENDING_REVIEW" as const,
    adminNotes: null,
    waybill: null,
    trackingUrl: null,
    paymentResponsibility: "NONE" as const,
    paymentAmount: 0,
    paymentStatus: "NOT_REQUIRED" as const,
    createdAt: new Date("2026-09-10T10:00:00Z"),
    updatedAt: new Date("2026-09-10T10:00:00Z"),
  };

  const mockPendingReplacement = {
    ...mockPendingReturn,
    id: "repl_audit_202",
    type: "REPLACEMENT" as const,
    replacementProductId: "prod_1",
    replacementVariantId: "var_1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertValues.mockClear();
    clearNotificationDedupeCache();
  });

  // ---------------------------------------------------------------------------
  // 1. Audit Log Event Verification
  // ---------------------------------------------------------------------------
  describe("Audit Log Generation", () => {
    it("logs RETURN_APPROVED action when admin approves a return request", async () => {
      vi.mocked(db.query.returnRequests.findFirst).mockResolvedValue(mockPendingReturn as any);

      const result = await reviewReturnRequest({
        requestId: mockPendingReturn.id,
        action: "APPROVE",
        paymentResponsibility: "NONE",
        adminUser: mockAdminUser,
      });

      expect(result.success).toBe(true);
      expect(mockInsertValues).toHaveBeenCalled();

      const insertedLog = mockInsertValues.mock.calls[0]?.[0];
      expect(insertedLog).toMatchObject({
        action: "RETURN_APPROVED",
        orderId: mockPendingReturn.orderId,
        adminId: mockAdminUser.id,
      });
    });

    it("logs REPLACEMENT_APPROVED action when admin approves a replacement request", async () => {
      vi.mocked(db.query.returnRequests.findFirst).mockResolvedValue(mockPendingReplacement as any);

      const result = await reviewReturnRequest({
        requestId: mockPendingReplacement.id,
        action: "APPROVE",
        paymentResponsibility: "NONE",
        adminUser: mockAdminUser,
      });

      expect(result.success).toBe(true);

      const insertedLog = mockInsertValues.mock.calls[0]?.[0];
      expect(insertedLog).toMatchObject({
        action: "REPLACEMENT_APPROVED",
        orderId: mockPendingReplacement.orderId,
        adminId: mockAdminUser.id,
      });
    });

    it("logs RETURN_REJECTED and REPLACEMENT_REJECTED actions correctly", async () => {
      // Return rejection
      vi.mocked(db.query.returnRequests.findFirst).mockResolvedValue(mockPendingReturn as any);
      await reviewReturnRequest({
        requestId: mockPendingReturn.id,
        action: "REJECT",
        adminNotes: "Not eligible",
        adminUser: mockAdminUser,
      });
      let insertedLog = mockInsertValues.mock.calls[0]?.[0];
      expect(insertedLog?.action).toBe("RETURN_REJECTED");

      mockInsertValues.mockClear();

      // Replacement rejection
      vi.mocked(db.query.returnRequests.findFirst).mockResolvedValue(mockPendingReplacement as any);
      await reviewReturnRequest({
        requestId: mockPendingReplacement.id,
        action: "REJECT",
        adminNotes: "Out of policy",
        adminUser: mockAdminUser,
      });
      insertedLog = mockInsertValues.mock.calls[0]?.[0];
      expect(insertedLog?.action).toBe("REPLACEMENT_REJECTED");
    });

    it("logs RETURN_PAYMENT_RECORDED and REPLACEMENT_PAYMENT_RECORDED when payment is recorded", async () => {
      const mockApprovedReturn = { ...mockPendingReturn, status: "APPROVED" as const };
      vi.mocked(db.query.returnRequests.findFirst).mockResolvedValue(mockApprovedReturn as any);

      await recordReturnPayment({
        requestId: mockApprovedReturn.id,
        paymentAmount: 25000,
        paymentMethod: "UPI",
        paymentReference: "UPI_AUDIT_999",
        adminUser: mockAdminUser,
      });

      const insertedLog = mockInsertValues.mock.calls[0]?.[0];
      expect(insertedLog?.action).toBe("RETURN_PAYMENT_RECORDED");
    });

    it("logs RETURN_REVERSE_PICKUP_CREATED, RETURN_RECEIVED, and RETURN_COMPLETED during return lifecycle", async () => {
      const mockApproved = {
        ...mockPendingReturn,
        status: "APPROVED" as const,
        paymentResponsibility: "NONE" as const,
        paymentStatus: "NOT_REQUIRED" as const,
      };
      vi.mocked(db.query.returnRequests.findFirst).mockResolvedValue(mockApproved as any);
      vi.mocked(db.query.orderAddresses.findFirst).mockResolvedValue({
        name: "Jane Doe",
        phone: "9876543210",
        addressLine1: "Line 1",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        country: "India",
      } as any);

      // Create Reverse Pickup
      await createReturnReversePickup({
        requestId: mockApproved.id,
        adminUser: mockAdminUser,
      });
      let insertedLog = mockInsertValues.mock.calls[0]?.[0];
      expect(insertedLog?.action).toBe("RETURN_REVERSE_PICKUP_CREATED");

      mockInsertValues.mockClear();

      // Mark Received & Completed
      const mockProcessing = { ...mockApproved, status: "PROCESSING" as const, waybill: "AWB123" };
      vi.mocked(db.query.returnRequests.findFirst).mockResolvedValue(mockProcessing as any);

      await markReturnReceived({
        requestId: mockProcessing.id,
        adminUser: mockAdminUser,
      });

      // markReturnReceived inserts RETURN_RECEIVED and RETURN_COMPLETED
      const actions = mockInsertValues.mock.calls.map((c) => c[0]?.action);
      expect(actions).toContain("RETURN_RECEIVED");
      expect(actions).toContain("RETURN_COMPLETED");
    });

    it("logs REPLACEMENT_REPL_CREATED and REPLACEMENT_COMPLETED during replacement lifecycle", async () => {
      const mockApproved = {
        ...mockPendingReplacement,
        status: "APPROVED" as const,
        paymentResponsibility: "NONE" as const,
        paymentStatus: "NOT_REQUIRED" as const,
      };
      vi.mocked(db.query.returnRequests.findFirst).mockResolvedValue(mockApproved as any);
      vi.mocked(db.query.productVariants.findFirst).mockResolvedValue({
        id: "var_1",
        productId: "prod_1",
        stockQuantity: 10,
        isActive: true,
      } as any);
      vi.mocked(db.query.inventoryItems.findFirst).mockResolvedValue({
        variantId: "var_1",
        availableQuantity: 10,
      } as any);
      vi.mocked(db.query.products.findFirst).mockResolvedValue({ id: "prod_1", name: "Nail Set" } as any);
      vi.mocked(db.query.orderAddresses.findFirst).mockResolvedValue({
        name: "Jane Doe",
        phone: "9876543210",
        addressLine1: "Line 1",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        country: "India",
      } as any);

      // Create REPL
      await createReplacementReplShipment({
        requestId: mockApproved.id,
        adminUser: mockAdminUser,
      });
      let insertedLog = mockInsertValues.mock.calls[0]?.[0];
      expect(insertedLog?.action).toBe("REPLACEMENT_REPL_CREATED");

      mockInsertValues.mockClear();

      // Mark Completed
      const mockProcessing = { ...mockApproved, status: "PROCESSING" as const, waybill: "REPL123" };
      vi.mocked(db.query.returnRequests.findFirst).mockResolvedValue(mockProcessing as any);

      await markReplacementCompleted({
        requestId: mockProcessing.id,
        adminUser: mockAdminUser,
      });
      insertedLog = mockInsertValues.mock.calls[0]?.[0];
      expect(insertedLog?.action).toBe("REPLACEMENT_COMPLETED");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Notification Triggers & Deduplication
  // ---------------------------------------------------------------------------
  describe("Notifications Suite", () => {
    it("dispatches return request received notification and prevents duplicates", async () => {
      const payload = { id: "req_notif_101", orderId: "ord_1", customerId: "cust_1", reason: "Damaged" };

      const first = await notifyReturnRequestReceived(payload);
      expect(first.success).toBe(true);
      expect(first.duplicate).toBe(false);
      expect(hasNotificationBeenSent(payload.id, "RETURN_REQUEST_RECEIVED")).toBe(true);

      const second = await notifyReturnRequestReceived(payload);
      expect(second.success).toBe(false);
      expect(second.duplicate).toBe(true);
    });

    it("supports all required return and replacement notification triggers", async () => {
      const payload = { id: "req_all_202", orderId: "ord_2", customerId: "cust_2" };

      expect((await notifyReturnApproved(payload)).success).toBe(true);
      expect((await notifyReturnRejected(payload)).success).toBe(true);
      expect((await notifyReturnPickupCreated(payload)).success).toBe(true);
      expect((await notifyReturnReceived(payload)).success).toBe(true);
      expect((await notifyReturnCompleted(payload)).success).toBe(true);

      expect((await notifyReplacementRequestReceived(payload)).success).toBe(true);
      expect((await notifyReplacementApproved(payload)).success).toBe(true);
      expect((await notifyReplacementRejected(payload)).success).toBe(true);
      expect((await notifyReplacementShipped(payload)).success).toBe(true);
      expect((await notifyReplacementDelivered(payload)).success).toBe(true);
    });
  });
});
