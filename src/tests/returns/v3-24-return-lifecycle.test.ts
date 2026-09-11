import { describe, it, expect, vi, beforeEach } from "vitest";
import { reviewReturnRequest } from "@/lib/returns/admin";
import { createReturnReversePickup, markReturnReceived } from "@/lib/returns/reverse-pickup";
import { db } from "@/db";

// Mock DB queries for isolated unit/integration testing
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

// Mock Delhivery reverse pickup provider API
vi.mock("@/lib/shipping/providers/delhivery/reverse-pickup", () => ({
  createDelhiveryReversePickup: vi.fn().mockResolvedValue({
    success: true,
    waybill: "REV_AWB_E2E_12345",
    trackingUrl: "https://track.delhivery.com/REV_AWB_E2E_12345",
  }),
}));

import { createDelhiveryReversePickup } from "@/lib/shipping/providers/delhivery/reverse-pickup";

describe("Phase V3-24: Return Lifecycle End-to-End Test Suite", () => {
  const mockAdminUser = {
    id: "usr_admin_001",
    name: "Logistics Manager",
    phoneNumber: "+919876543210",
    role: "admin" as const,
  };

  const mockCustomer = {
    id: "usr_cust_001",
    name: "Anjali Sharma",
    phoneNumber: "+919811122233",
  };

  const baseReturnRequest = {
    id: "ret_e2e_001",
    orderId: "ord_e2e_100",
    orderItemId: "item_e2e_200",
    customerId: mockCustomer.id,
    type: "RETURN" as const,
    reason: "Wrong Size",
    customerNotes: "Size M was too big for me.",
    status: "PENDING_REVIEW" as const,
    adminNotes: null,
    replacementProductId: null,
    replacementVariantId: null,
    waybill: null,
    trackingUrl: null,
    paymentResponsibility: null,
    paymentAmount: null,
    paymentStatus: "NOT_REQUIRED" as const,
    paymentMethod: null,
    paymentReference: null,
    paymentNotes: null,
    paidAt: null,
    recordedBy: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: new Date("2026-09-09T10:00:00Z"),
    updatedAt: new Date("2026-09-09T10:00:00Z"),
  };

  const mockAddress = {
    id: "addr_e2e_001",
    orderId: "ord_e2e_100",
    fullName: "Anjali Sharma",
    phone: "+919811122233",
    streetAddress: "123 Green Park",
    city: "New Delhi",
    state: "Delhi",
    postalCode: "110016",
    country: "India",
  };

  const mockOrderItem = {
    id: "item_e2e_200",
    orderId: "ord_e2e_100",
    productName: "Velvet Press-On Nails",
    variantName: "Size M",
    quantity: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("V3-24.1 Full Return Success Journey", () => {
    it("should execute full return flow: Pending -> Admin Approval -> Delhivery Pickup -> Return Received -> Completed", async () => {
      // Step 1: Request in PENDING_REVIEW state
      (db.query.returnRequests.findFirst as any).mockResolvedValueOnce(baseReturnRequest);

      // Step 2: Admin Approves Return Request with No Payment Required
      const approvalResult = await reviewReturnRequest({
        requestId: baseReturnRequest.id,
        action: "APPROVE",
        paymentResponsibility: "NONE",
        adminNotes: "Return request verified and approved.",
        adminUser: mockAdminUser,
      });

      expect(approvalResult.success).toBe(true);
      expect(db.update).toHaveBeenCalled();

      // Step 3: Create Delhivery Reverse Pickup Shipment
      const approvedRequest = {
        ...baseReturnRequest,
        status: "APPROVED" as const,
        paymentResponsibility: "NONE" as const,
        paymentStatus: "NOT_REQUIRED" as const,
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValueOnce(approvedRequest);
      (db.query.orderAddresses.findFirst as any).mockResolvedValueOnce(mockAddress);
      (db.query.orderItems.findFirst as any).mockResolvedValueOnce(mockOrderItem);

      const pickupResult = await createReturnReversePickup({
        requestId: baseReturnRequest.id,
        adminUser: mockAdminUser,
      });

      expect(pickupResult.success).toBe(true);
      expect(pickupResult.waybill).toBe("REV_AWB_E2E_12345");
      expect(createDelhiveryReversePickup).toHaveBeenCalled();

      // Step 4: Mark Returned Item Received at Warehouse & Complete
      const inTransitRequest = {
        ...approvedRequest,
        status: "PROCESSING" as const,
        waybill: "REV_AWB_E2E_12345",
        trackingUrl: "https://track.delhivery.com/REV_AWB_E2E_12345",
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValueOnce(inTransitRequest);

      const markReceivedResult = await markReturnReceived({
        requestId: baseReturnRequest.id,
        adminNotes: "Item received at warehouse in original packaging. Inspection passed.",
        adminUser: mockAdminUser,
      });

      expect(markReceivedResult.success).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe("V3-24.1 Return Rejection Flow", () => {
    it("should reject return request when admin provides mandatory rejection notes", async () => {
      (db.query.returnRequests.findFirst as any).mockResolvedValueOnce(baseReturnRequest);

      const rejectionResult = await reviewReturnRequest({
        requestId: baseReturnRequest.id,
        action: "REJECT",
        adminNotes: "Item requested for return exceeds policy window of 3 days after delivery.",
        adminUser: mockAdminUser,
      });

      expect(rejectionResult.success).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });

    it("should fail rejection when admin notes are missing", async () => {
      (db.query.returnRequests.findFirst as any).mockResolvedValueOnce(baseReturnRequest);

      const rejectionResult = await reviewReturnRequest({
        requestId: baseReturnRequest.id,
        action: "REJECT",
        adminNotes: "", // empty note
        adminUser: mockAdminUser,
      });

      expect(rejectionResult.success).toBe(false);
      expect(rejectionResult.error).toContain("Admin rejection notes are required");
    });
  });
});
