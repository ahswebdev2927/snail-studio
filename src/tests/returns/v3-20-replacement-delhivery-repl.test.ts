import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDelhiveryREPL } from "@/lib/shipping/providers/delhivery/repl";
import { createReplacementReplShipment, markReplacementCompleted } from "@/lib/returns/replacement";
import { db } from "@/db";

// Mock Delhivery fetch client
vi.mock("@/lib/shipping/providers/delhivery/client", () => ({
  delhiveryFetch: vi.fn(),
}));

// Mock Delhivery config
vi.mock("@/lib/shipping/providers/delhivery/config", () => ({
  getDelhiveryConfig: vi.fn(() => ({
    baseUrl: "https://track.delhivery.com",
    apiToken: "test_api_token_123",
    pickupLocation: "Snailstudio Pvt Ltd",
    originPincode: "122003",
    sellerName: "Snail Studio",
  })),
}));

// Mock DB queries for isolated testing
vi.mock("@/db", () => ({
  db: {
    query: {
      returnRequests: {
        findFirst: vi.fn(),
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

import { delhiveryFetch } from "@/lib/shipping/providers/delhivery/client";
import { getDelhiveryConfig } from "@/lib/shipping/providers/delhivery/config";

describe("Phase V3-20: Replacement & Delhivery REPL Test Suite", () => {
  const mockAdminUser = {
    id: "usr_admin_99",
    name: "Logistics Manager",
    phoneNumber: "+919876543210",
    role: "admin" as const,
  };

  const mockRequestId = "repl_req_v320_001";
  const mockOrderId = "ord_v320_001";
  const mockReplacementProductId = "prod_002";
  const mockReplacementVariantId = "var_002_large";

  const mockApprovedReplacementRequest = {
    id: mockRequestId,
    orderId: mockOrderId,
    orderItemId: "item_v320_100",
    customerId: "usr_cust_100",
    type: "REPLACEMENT" as const,
    reason: "Wrong Size",
    customerNotes: "Please send Size L instead.",
    status: "APPROVED" as const,
    adminNotes: "Approved replacement request.",
    replacementProductId: mockReplacementProductId,
    replacementVariantId: mockReplacementVariantId,
    waybill: null,
    trackingUrl: null,
    paymentResponsibility: "NONE" as const,
    paymentAmount: 0,
    paymentStatus: "NOT_REQUIRED" as const,
    createdAt: new Date("2026-09-09T12:00:00Z"),
    updatedAt: new Date("2026-09-09T12:00:00Z"),
  };

  const mockCustomerAddress = {
    id: "addr_200",
    orderId: mockOrderId,
    type: "shipping" as const,
    name: "Rahul Verma",
    phone: "+919822233344",
    addressLine1: "Villa 12, Palm Meadows",
    addressLine2: "Indiranagar",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560038",
    country: "India",
  };

  const mockReplacementVariant = {
    id: mockReplacementVariantId,
    productId: mockReplacementProductId,
    sku: "PRESS-NAIL-L",
    name: "Size L",
    price: 1299,
    status: "Active",
    product: {
      id: mockReplacementProductId,
      name: "Velvet Rose Press-On Set",
      title: "Velvet Rose Press-On Set",
    },
    inventoryItem: {
      id: "inv_var_002",
      variantId: mockReplacementVariantId,
      stockLevel: 15,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (db.query.products.findFirst as any).mockResolvedValue(mockReplacementVariant.product);
    (db.query.inventoryItems.findFirst as any).mockResolvedValue(mockReplacementVariant.inventoryItem);
  });

  // --- 1. PROVIDER LAYER TESTS ---
  describe("Provider Layer: createDelhiveryREPL", () => {
    it("should construct correct REPL shipment payload with payment_mode = REPL and single waybill", async () => {
      (delhiveryFetch as any).mockResolvedValue({
        success: true,
        packages: [
          {
            status: "Success",
            waybill: "REPL123456789",
          },
        ],
      });

      const res = await createDelhiveryREPL({
        requestId: mockRequestId,
        orderId: mockOrderId,
        customerAddress: {
          name: mockCustomerAddress.name,
          phone: mockCustomerAddress.phone,
          addressLine1: mockCustomerAddress.addressLine1,
          city: mockCustomerAddress.city,
          state: mockCustomerAddress.state,
          postalCode: mockCustomerAddress.postalCode,
          country: mockCustomerAddress.country,
        },
        replacementItemDesc: "Velvet Rose Press-On Set (Size L)",
        quantity: 1,
      });

      expect(res.success).toBe(true);
      expect(res.waybill).toBe("REPL123456789");
      expect(res.trackingUrl).toBe("https://track.delhivery.com/track/package/REPL123456789");

      expect(delhiveryFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: "/api/cmu/create.json",
          method: "POST",
          contentType: "text/plain",
        })
      );

      const fetchCallArg = (delhiveryFetch as any).mock.calls[0][0];
      expect(fetchCallArg.body).toContain('"payment_mode":"REPL"');
    });

    it("should throw error if API token is missing in config", async () => {
      (getDelhiveryConfig as any).mockReturnValueOnce({ apiToken: "" });

      await expect(
        createDelhiveryREPL({
          requestId: mockRequestId,
          orderId: mockOrderId,
          customerAddress: {
            name: "Test",
            phone: "9999999999",
            addressLine1: "Line 1",
            city: "City",
            state: "State",
            postalCode: "560001",
          },
        })
      ).rejects.toThrow("Delhivery API Token is missing");
    });

    it("should throw error if Delhivery API rejects REPL shipment creation", async () => {
      (delhiveryFetch as any).mockResolvedValue({
        success: false,
        error: true,
        rmk: "Destination pincode non-serviceable for REPL exchange",
        packages: [{ status: "Failed", remarks: ["Non-serviceable pincode"] }],
      });

      await expect(
        createDelhiveryREPL({
          requestId: mockRequestId,
          orderId: mockOrderId,
          customerAddress: {
            name: mockCustomerAddress.name,
            phone: mockCustomerAddress.phone,
            addressLine1: mockCustomerAddress.addressLine1,
            city: mockCustomerAddress.city,
            state: mockCustomerAddress.state,
            postalCode: mockCustomerAddress.postalCode,
          },
        })
      ).rejects.toThrow("Delhivery REPL Error");
    });
  });

  // --- 2. CORE DOMAIN SERVICE TESTS ---
  describe("Domain Layer: createReplacementReplShipment", () => {
    it("should successfully create REPL shipment and transition status APPROVED -> PROCESSING", async () => {
      (db.query.returnRequests.findFirst as any).mockResolvedValue(mockApprovedReplacementRequest);
      (db.query.productVariants.findFirst as any).mockResolvedValue(mockReplacementVariant);
      (db.query.orderAddresses.findFirst as any).mockResolvedValue(mockCustomerAddress);
      (delhiveryFetch as any).mockResolvedValue({
        success: true,
        packages: [{ status: "Success", waybill: "REPL987654321" }],
      });

      const res = await createReplacementReplShipment({
        requestId: mockRequestId,
        adminUser: mockAdminUser as any,
      });

      expect(res.success).toBe(true);
      expect(res.waybill).toBe("REPL987654321");
      expect(res.returnRequest.status).toBe("PROCESSING");
      expect(db.update).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });

    it("should enforce Payment Gate: block when CUSTOMER_PAYS and paymentStatus is PENDING", async () => {
      const pendingPaymentRequest = {
        ...mockApprovedReplacementRequest,
        paymentResponsibility: "CUSTOMER_PAYS" as const,
        paymentAmount: 40000,
        paymentStatus: "PENDING" as const,
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValue(pendingPaymentRequest);

      const res = await createReplacementReplShipment({
        requestId: mockRequestId,
        adminUser: mockAdminUser as any,
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain("Customer payment of ₹400.00 is required");
      expect(delhiveryFetch).not.toHaveBeenCalled();
    });

    it("should allow REPL shipment when CUSTOMER_PAYS and paymentStatus is PAID", async () => {
      const paidCustomerRequest = {
        ...mockApprovedReplacementRequest,
        paymentResponsibility: "CUSTOMER_PAYS" as const,
        paymentAmount: 40000,
        paymentStatus: "PAID" as const,
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValue(paidCustomerRequest);
      (db.query.productVariants.findFirst as any).mockResolvedValue(mockReplacementVariant);
      (db.query.orderAddresses.findFirst as any).mockResolvedValue(mockCustomerAddress);
      (delhiveryFetch as any).mockResolvedValue({
        success: true,
        packages: [{ status: "Success", waybill: "REPLPAID99" }],
      });

      const res = await createReplacementReplShipment({
        requestId: mockRequestId,
        adminUser: mockAdminUser as any,
      });

      expect(res.success).toBe(true);
      expect(res.waybill).toBe("REPLPAID99");
    });

    it("should reject REPL creation if replacement variant is inactive or out of stock", async () => {
      const outOfStockVariant = {
        ...mockReplacementVariant,
        inventoryItem: {
          id: "inv_var_002",
          variantId: mockReplacementVariantId,
          stockLevel: 0,
        },
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValue(mockApprovedReplacementRequest);
      (db.query.orderItems.findFirst as any).mockResolvedValue({ id: "item_1", quantity: 1 });
      (db.query.productVariants.findFirst as any).mockResolvedValue(outOfStockVariant);
      (db.query.inventoryItems.findFirst as any).mockResolvedValue({
        id: "inv_var_002",
        variantId: mockReplacementVariantId,
        stockLevel: 0,
      });

      const res = await createReplacementReplShipment({
        requestId: mockRequestId,
        adminUser: mockAdminUser as any,
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain("Insufficient inventory");
      expect(delhiveryFetch).not.toHaveBeenCalled();
    });

    it("should enforce Duplicate Protection: reject if waybill already exists and status is PROCESSING", async () => {
      const existingProcessingRequest = {
        ...mockApprovedReplacementRequest,
        status: "PROCESSING" as const,
        waybill: "REPL123456789",
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValue(existingProcessingRequest);

      const res = await createReplacementReplShipment({
        requestId: mockRequestId,
        adminUser: mockAdminUser as any,
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain("REPL shipment has already been created");
    });

    it("should reject non-REPLACEMENT request types (e.g. RETURN)", async () => {
      const returnRequest = {
        ...mockApprovedReplacementRequest,
        type: "RETURN" as const,
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValue(returnRequest);

      const res = await createReplacementReplShipment({
        requestId: mockRequestId,
        adminUser: mockAdminUser as any,
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain("Only replacement requests support Delhivery REPL");
    });

    it("should keep status APPROVED if Delhivery API call throws an error (Retry capability)", async () => {
      (db.query.returnRequests.findFirst as any).mockResolvedValue(mockApprovedReplacementRequest);
      (db.query.productVariants.findFirst as any).mockResolvedValue(mockReplacementVariant);
      (db.query.orderAddresses.findFirst as any).mockResolvedValue(mockCustomerAddress);
      (delhiveryFetch as any).mockRejectedValue(new Error("Delhivery Network Error"));

      const res = await createReplacementReplShipment({
        requestId: mockRequestId,
        adminUser: mockAdminUser as any,
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe(500);
      expect(res.error).toContain("Delhivery Network Error");
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  // --- 3. MARK REPLACEMENT COMPLETED TESTS ---
  describe("Domain Layer: markReplacementCompleted", () => {
    it("should update status from PROCESSING to COMPLETED and audit log REPLACEMENT_COMPLETED", async () => {
      const processingRequest = {
        ...mockApprovedReplacementRequest,
        status: "PROCESSING" as const,
        waybill: "REPL987654321",
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValue(processingRequest);

      const res = await markReplacementCompleted({
        requestId: mockRequestId,
        adminUser: mockAdminUser as any,
      });

      expect(res.success).toBe(true);
      expect(res.returnRequest.status).toBe("COMPLETED");
      expect(db.update).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });

    it("should reject marking as completed for already COMPLETED or REJECTED requests", async () => {
      const completedRequest = {
        ...mockApprovedReplacementRequest,
        status: "COMPLETED" as const,
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValue(completedRequest);

      const res = await markReplacementCompleted({
        requestId: mockRequestId,
        adminUser: mockAdminUser as any,
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain("cannot be marked as completed");
    });
  });
});
