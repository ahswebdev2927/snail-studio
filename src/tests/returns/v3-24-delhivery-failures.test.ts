import { describe, it, expect, vi, beforeEach } from "vitest";
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
      inventoryItems: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
      })),
    })),
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

// Mock Delhivery reverse pickup provider
vi.mock("@/lib/shipping/providers/delhivery/reverse-pickup", () => ({
  createDelhiveryReversePickup: vi.fn(),
}));

// Mock Delhivery REPL provider
vi.mock("@/lib/shipping/providers/delhivery/repl", () => ({
  createDelhiveryREPL: vi.fn(),
}));

import { createDelhiveryReversePickup } from "@/lib/shipping/providers/delhivery/reverse-pickup";
import { createDelhiveryREPL } from "@/lib/shipping/providers/delhivery/repl";

describe("Phase V3-24: Delhivery Failure Handling & Resiliency Test Suite", () => {
  const mockAdminUser = {
    id: "usr_admin_fail",
    name: "Resilience Admin",
    phoneNumber: "+919876543000",
    role: "admin" as const,
  };

  const approvedReturnRequest = {
    id: "ret_fail_001",
    orderId: "ord_fail_100",
    orderItemId: "item_fail_100",
    customerId: "usr_cust_fail",
    type: "RETURN" as const,
    reason: "Damaged",
    customerNotes: "Damaged on arrival",
    status: "APPROVED" as const,
    adminNotes: null,
    waybill: null,
    trackingUrl: null,
    paymentResponsibility: "NONE" as const,
    paymentAmount: null,
    paymentStatus: "NOT_REQUIRED" as const,
    createdAt: new Date("2026-09-09T10:00:00Z"),
    updatedAt: new Date("2026-09-09T10:00:00Z"),
  };

  const approvedPaidReplacementRequest = {
    id: "repl_fail_002",
    orderId: "ord_fail_200",
    orderItemId: "item_fail_200",
    customerId: "usr_cust_fail",
    type: "REPLACEMENT" as const,
    reason: "Wrong Item",
    customerNotes: "Received wrong item",
    status: "APPROVED" as const,
    replacementProductId: "prod_01",
    replacementVariantId: "var_01",
    paymentResponsibility: "STORE_PAYS" as const,
    paymentStatus: "NOT_REQUIRED" as const,
    waybill: null,
    createdAt: new Date("2026-09-09T10:00:00Z"),
    updatedAt: new Date("2026-09-09T10:00:00Z"),
  };

  const mockAddress = {
    id: "addr_fail_01",
    orderId: "ord_fail_100",
    fullName: "Testing User",
    phone: "+919876543210",
    streetAddress: "Sector 62",
    city: "Noida",
    state: "Uttar Pradesh",
    postalCode: "201301",
    country: "India",
  };

  const mockOrderItem = {
    id: "item_fail_100",
    productName: "French Tip Nails",
    variantName: "Standard",
    quantity: 1,
  };

  const mockVariant = {
    id: "var_01",
    productId: "prod_01",
    name: "Standard",
    sku: "SKU_FRENCH_01",
    status: "Active",
    inventoryQuantity: 10,
  };

  const mockInventoryItem = {
    id: "inv_01",
    variantId: "var_01",
    stockLevel: 10,
    reservedQuantity: 0,
  };

  const mockProduct = {
    id: "prod_01",
    title: "French Tip Nails",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Delhivery API Failure & Retry Safety", () => {
    it("should handle Pickup API network timeout without saving false AWB or corrupting request state", async () => {
      (db.query.returnRequests.findFirst as any).mockResolvedValueOnce(approvedReturnRequest);
      (db.query.orderAddresses.findFirst as any).mockResolvedValueOnce(mockAddress);
      (db.query.orderItems.findFirst as any).mockResolvedValueOnce(mockOrderItem);

      // Simulate API timeout/failure from Delhivery provider
      (createDelhiveryReversePickup as any).mockRejectedValueOnce(
        new Error("Delhivery API request timed out after 10000ms")
      );

      const result = await createReturnReversePickup({
        requestId: approvedReturnRequest.id,
        adminUser: mockAdminUser,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Delhivery API request timed out after 10000ms");

      // Verify DB update was NOT called to write a false waybill
      expect(db.update).not.toHaveBeenCalled();
    });

    it("should handle REPL API HTTP 500 failure gracefully without marking request completed", async () => {
      (db.query.returnRequests.findFirst as any).mockResolvedValueOnce(approvedPaidReplacementRequest);
      (db.query.orderAddresses.findFirst as any).mockResolvedValueOnce(mockAddress);
      (db.query.orderItems.findFirst as any).mockResolvedValueOnce(mockOrderItem);
      (db.query.productVariants.findFirst as any).mockResolvedValueOnce(mockVariant);
      (db.query.inventoryItems.findFirst as any).mockResolvedValueOnce(mockInventoryItem);
      (db.query.products.findFirst as any).mockResolvedValueOnce(mockProduct);

      (createDelhiveryREPL as any).mockResolvedValueOnce({
        success: false,
        error: "Delhivery Server Error: Internal Gateway Error (500)",
      });

      const result = await createReplacementReplShipment({
        requestId: approvedPaidReplacementRequest.id,
        adminUser: mockAdminUser,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe("Duplicate Shipment Creation Protection", () => {
    it("should reject pickup creation if request already has a waybill assigned", async () => {
      const alreadyShippedReturn = {
        ...approvedReturnRequest,
        status: "PROCESSING" as const,
        waybill: "REV_AWB_EXISTING_99",
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValueOnce(alreadyShippedReturn);

      const result = await createReturnReversePickup({
        requestId: alreadyShippedReturn.id,
        adminUser: mockAdminUser,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Reverse pickup has already been created for this return request");
    });

    it("should reject REPL creation if replacement request already has a waybill assigned", async () => {
      const alreadyShippedReplacement = {
        ...approvedPaidReplacementRequest,
        status: "PROCESSING" as const,
        waybill: "REPL_AWB_EXISTING_88",
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValueOnce(alreadyShippedReplacement);

      const result = await createReplacementReplShipment({
        requestId: alreadyShippedReplacement.id,
        adminUser: mockAdminUser,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("REPL shipment has already been created for this replacement request");
    });
  });

  describe("Pre-call Input & Inventory Validation Failures", () => {
    it("should reject replacement REPL creation if requested variant is inactive", async () => {
      const inactiveVariant = {
        ...mockVariant,
        status: "Draft",
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValueOnce(approvedPaidReplacementRequest);
      (db.query.orderAddresses.findFirst as any).mockResolvedValueOnce(mockAddress);
      (db.query.orderItems.findFirst as any).mockResolvedValueOnce(mockOrderItem);
      (db.query.productVariants.findFirst as any).mockResolvedValueOnce(inactiveVariant);
      (db.query.inventoryItems.findFirst as any).mockResolvedValueOnce(mockInventoryItem);

      const result = await createReplacementReplShipment({
        requestId: approvedPaidReplacementRequest.id,
        adminUser: mockAdminUser,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not active");

      // Verify Delhivery provider was not called
      expect(createDelhiveryREPL).not.toHaveBeenCalled();
    });
  });
});
