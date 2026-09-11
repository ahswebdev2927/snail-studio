import { describe, it, expect, vi, beforeEach } from "vitest";
import { reviewReturnRequest } from "@/lib/returns/admin";
import { recordReturnPayment } from "@/lib/returns/payment";
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

// Mock Delhivery REPL API call
vi.mock("@/lib/shipping/providers/delhivery/repl", () => ({
  createDelhiveryREPL: vi.fn().mockResolvedValue({
    success: true,
    waybill: "REPL_AWB_SINGLE_998877",
    trackingUrl: "https://track.delhivery.com/REPL_AWB_SINGLE_998877",
  }),
}));

import { createDelhiveryREPL } from "@/lib/shipping/providers/delhivery/repl";

describe("Phase V3-24: Replacement Lifecycle End-to-End Test Suite", () => {
  const mockAdminUser = {
    id: "usr_admin_002",
    name: "Operations Lead",
    phoneNumber: "+919876543211",
    role: "admin" as const,
  };

  const mockCustomer = {
    id: "usr_cust_002",
    name: "Rohan Verma",
    phoneNumber: "+919822233344",
  };

  const baseReplacementRequest = {
    id: "repl_e2e_001",
    orderId: "ord_e2e_200",
    orderItemId: "item_e2e_300",
    customerId: mockCustomer.id,
    type: "REPLACEMENT" as const,
    reason: "Wrong Size",
    customerNotes: "Received Size S, need Size L.",
    status: "PENDING_REVIEW" as const,
    adminNotes: null,
    replacementProductId: "prod_nail_001",
    replacementVariantId: "var_size_l",
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
    id: "addr_e2e_002",
    orderId: "ord_e2e_200",
    fullName: "Rohan Verma",
    phone: "+919822233344",
    streetAddress: "45 MG Road",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560001",
    country: "India",
  };

  const mockOrderItem = {
    id: "item_e2e_300",
    orderId: "ord_e2e_200",
    productName: "Matte Black Press-On Nails",
    variantName: "Size S",
    quantity: 1,
  };

  const mockReplacementVariant = {
    id: "var_size_l",
    productId: "prod_nail_001",
    name: "Size L",
    sku: "NAIL-MATTE-L",
    active: true,
    inventoryQuantity: 25,
  };

  const mockInventoryItem = {
    id: "inv_size_l",
    variantId: "var_size_l",
    quantity: 25,
    reservedQuantity: 0,
  };

  const mockProduct = {
    id: "prod_nail_001",
    title: "Matte Black Press-On Nails",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("V3-24.2 Replacement Success Journey (Customer Pays Flow)", () => {
    it("should execute full replacement lifecycle: Request -> Approval -> Payment -> Single REPL AWB", async () => {
      // Step 1: Admin Approves Replacement Request with Customer Pays ₹360.00 (36000 paise)
      (db.query.returnRequests.findFirst as any).mockResolvedValueOnce(baseReplacementRequest);

      const approvalResult = await reviewReturnRequest({
        requestId: baseReplacementRequest.id,
        action: "APPROVE",
        paymentResponsibility: "CUSTOMER_PAYS",
        paymentAmount: 36000,
        adminNotes: "Replacement approved. Customer bears ₹360 exchange shipping fee.",
        adminUser: mockAdminUser,
      });

      expect(approvalResult.success).toBe(true);

      // Step 2: Payment Gate Check - Attempting REPL shipment before payment must fail gracefully with status 400
      const pendingPaymentRequest = {
        ...baseReplacementRequest,
        status: "APPROVED" as const,
        paymentResponsibility: "CUSTOMER_PAYS" as const,
        paymentAmount: 36000,
        paymentStatus: "PENDING" as const,
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValueOnce(pendingPaymentRequest);

      const blockedShipmentResult = await createReplacementReplShipment({
        requestId: baseReplacementRequest.id,
        adminUser: mockAdminUser,
      });

      expect(blockedShipmentResult.success).toBe(false);
      expect(blockedShipmentResult.error).toContain("Customer payment of ₹360.00 is required before creating REPL shipment");

      // Step 3: Admin Records Payment
      (db.query.returnRequests.findFirst as any).mockResolvedValueOnce(pendingPaymentRequest);

      const paymentResult = await recordReturnPayment({
        requestId: baseReplacementRequest.id,
        paymentAmount: 36000,
        paymentMethod: "UPI",
        paymentReference: "UPI_TXN_REPL_9988",
        paymentNotes: "Customer paid ₹360 replacement shipping via UPI",
        adminUser: mockAdminUser,
      });

      expect(paymentResult.success).toBe(true);

      // Step 4: Admin Creates Delhivery REPL Shipment
      const paidRequest = {
        ...pendingPaymentRequest,
        paymentStatus: "PAID" as const,
        paymentMethod: "UPI",
        paymentReference: "UPI_TXN_REPL_9988",
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValueOnce(paidRequest);
      (db.query.orderAddresses.findFirst as any).mockResolvedValueOnce(mockAddress);
      (db.query.orderItems.findFirst as any).mockResolvedValueOnce(mockOrderItem);
      (db.query.productVariants.findFirst as any).mockResolvedValueOnce(mockReplacementVariant);
      (db.query.inventoryItems.findFirst as any).mockResolvedValueOnce(mockInventoryItem);
      (db.query.products.findFirst as any).mockResolvedValueOnce(mockProduct);

      const replResult = await createReplacementReplShipment({
        requestId: baseReplacementRequest.id,
        adminUser: mockAdminUser,
      });

      expect(replResult.success).toBe(true);
      expect(replResult.waybill).toBe("REPL_AWB_SINGLE_998877");
      expect(createDelhiveryREPL).toHaveBeenCalledTimes(1);
    });
  });
});
