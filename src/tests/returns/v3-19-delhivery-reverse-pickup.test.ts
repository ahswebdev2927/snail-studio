import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDelhiveryReversePickup } from "@/lib/shipping/providers/delhivery/reverse-pickup";
import { createReturnReversePickup, markReturnReceived } from "@/lib/returns/reverse-pickup";
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

describe("Phase V3-19: Delhivery Reverse Pickup Test Suite", () => {
  const mockAdminUser = {
    id: "usr_admin_99",
    name: "Logistics Manager",
    phoneNumber: "+919876543210",
    role: "admin" as const,
  };

  const mockRequestId = "ret_req_v319_001";
  const mockOrderId = "ord_v319_001";

  const mockApprovedReturnRequest = {
    id: mockRequestId,
    orderId: mockOrderId,
    orderItemId: "item_v319_100",
    customerId: "usr_cust_100",
    type: "RETURN" as const,
    reason: "Damaged",
    customerNotes: "Package was torn on delivery.",
    status: "APPROVED" as const,
    adminNotes: "Approved for free return.",
    waybill: null,
    trackingUrl: null,
    paymentResponsibility: "NONE" as const,
    paymentAmount: 0,
    paymentStatus: "NOT_REQUIRED" as const,
    createdAt: new Date("2026-09-09T12:00:00Z"),
    updatedAt: new Date("2026-09-09T12:00:00Z"),
  };

  const mockCustomerAddress = {
    id: "addr_100",
    orderId: mockOrderId,
    type: "shipping" as const,
    name: "Priya Sharma",
    phone: "+919811122233",
    addressLine1: "Flat 402, Sunshine Apartments",
    addressLine2: "DLF Phase 3",
    city: "Gurugram",
    state: "Haryana",
    postalCode: "122002",
    country: "India",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- 1. PROVIDER LAYER TESTS ---
  describe("Provider Layer: createDelhiveryReversePickup", () => {
    it("should construct correct reverse shipment payload with payment_mode = Pickup", async () => {
      (delhiveryFetch as any).mockResolvedValue({
        success: true,
        packages: [
          {
            status: "Success",
            waybill: "REV123456789",
          },
        ],
      });

      const res = await createDelhiveryReversePickup({
        requestId: mockRequestId,
        orderId: mockOrderId,
        pickupAddress: {
          name: mockCustomerAddress.name,
          phone: mockCustomerAddress.phone,
          addressLine1: mockCustomerAddress.addressLine1,
          city: mockCustomerAddress.city,
          state: mockCustomerAddress.state,
          postalCode: mockCustomerAddress.postalCode,
          country: mockCustomerAddress.country,
        },
        itemsDesc: "Damaged Press-On Nails Set",
        quantity: 1,
      });

      expect(res.success).toBe(true);
      expect(res.waybill).toBe("REV123456789");
      expect(res.trackingUrl).toBe("https://track.delhivery.com/track/package/REV123456789");

      expect(delhiveryFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: "/api/cmu/create.json",
          method: "POST",
          contentType: "text/plain",
        })
      );

      const fetchCallArg = (delhiveryFetch as any).mock.calls[0][0];
      expect(fetchCallArg.body).toContain('"payment_mode":"Pickup"');
    });

    it("should throw error if API token is missing in config", async () => {
      (getDelhiveryConfig as any).mockReturnValueOnce({ apiToken: "" });

      await expect(
        createDelhiveryReversePickup({
          requestId: mockRequestId,
          orderId: mockOrderId,
          pickupAddress: {
            name: "Test",
            phone: "9999999999",
            addressLine1: "Line 1",
            city: "City",
            state: "State",
            postalCode: "110001",
          },
        })
      ).rejects.toThrow("Delhivery API Token is missing");
    });

    it("should throw error if Delhivery API rejects reverse pickup creation", async () => {
      (delhiveryFetch as any).mockResolvedValue({
        success: false,
        error: true,
        rmk: "Pickup pincode non-serviceable for reverse pickup",
        packages: [{ status: "Failed", remarks: ["Non-serviceable pincode"] }],
      });

      await expect(
        createDelhiveryReversePickup({
          requestId: mockRequestId,
          orderId: mockOrderId,
          pickupAddress: {
            name: mockCustomerAddress.name,
            phone: mockCustomerAddress.phone,
            addressLine1: mockCustomerAddress.addressLine1,
            city: mockCustomerAddress.city,
            state: mockCustomerAddress.state,
            postalCode: mockCustomerAddress.postalCode,
          },
        })
      ).rejects.toThrow("Delhivery Reverse Pickup Error");
    });
  });

  // --- 2. CORE DOMAIN SERVICE TESTS ---
  describe("Domain Layer: createReturnReversePickup", () => {
    it("should successfully create reverse pickup and transition status APPROVED -> PROCESSING", async () => {
      (db.query.returnRequests.findFirst as any).mockResolvedValue(mockApprovedReturnRequest);
      (db.query.orderAddresses.findFirst as any).mockResolvedValue(mockCustomerAddress);
      (delhiveryFetch as any).mockResolvedValue({
        success: true,
        packages: [{ status: "Success", waybill: "REV987654321" }],
      });

      const res = await createReturnReversePickup({
        requestId: mockRequestId,
        adminUser: mockAdminUser as any,
      });

      expect(res.success).toBe(true);
      expect(res.waybill).toBe("REV987654321");
      expect(res.returnRequest.status).toBe("PROCESSING");
      expect(db.update).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });

    it("should enforce Payment Gate: block when CUSTOMER_PAYS and paymentStatus is PENDING", async () => {
      const pendingPaymentRequest = {
        ...mockApprovedReturnRequest,
        paymentResponsibility: "CUSTOMER_PAYS" as const,
        paymentAmount: 36000,
        paymentStatus: "PENDING" as const,
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValue(pendingPaymentRequest);

      const res = await createReturnReversePickup({
        requestId: mockRequestId,
        adminUser: mockAdminUser as any,
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain("Customer payment of ₹360.00 is required");
      expect(delhiveryFetch).not.toHaveBeenCalled();
    });

    it("should allow Reverse Pickup when CUSTOMER_PAYS and paymentStatus is PAID", async () => {
      const paidCustomerRequest = {
        ...mockApprovedReturnRequest,
        paymentResponsibility: "CUSTOMER_PAYS" as const,
        paymentAmount: 36000,
        paymentStatus: "PAID" as const,
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValue(paidCustomerRequest);
      (db.query.orderAddresses.findFirst as any).mockResolvedValue(mockCustomerAddress);
      (delhiveryFetch as any).mockResolvedValue({
        success: true,
        packages: [{ status: "Success", waybill: "REVPAID123" }],
      });

      const res = await createReturnReversePickup({
        requestId: mockRequestId,
        adminUser: mockAdminUser as any,
      });

      expect(res.success).toBe(true);
      expect(res.waybill).toBe("REVPAID123");
    });

    it("should enforce Duplicate Protection: reject if waybill already exists and status is PROCESSING", async () => {
      const existingProcessingRequest = {
        ...mockApprovedReturnRequest,
        status: "PROCESSING" as const,
        waybill: "REV123456789",
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValue(existingProcessingRequest);

      const res = await createReturnReversePickup({
        requestId: mockRequestId,
        adminUser: mockAdminUser as any,
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain("Reverse pickup has already been created");
    });

    it("should reject non-RETURN request types (e.g. REPLACEMENT)", async () => {
      const replacementRequest = {
        ...mockApprovedReturnRequest,
        type: "REPLACEMENT" as const,
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValue(replacementRequest);

      const res = await createReturnReversePickup({
        requestId: mockRequestId,
        adminUser: mockAdminUser as any,
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain("Only return requests support reverse pickup");
    });

    it("should keep status APPROVED if Delhivery API call throws an error (Retry capability)", async () => {
      (db.query.returnRequests.findFirst as any).mockResolvedValue(mockApprovedReturnRequest);
      (db.query.orderAddresses.findFirst as any).mockResolvedValue(mockCustomerAddress);
      (delhiveryFetch as any).mockRejectedValue(new Error("Delhivery CMU API Timeout"));

      const res = await createReturnReversePickup({
        requestId: mockRequestId,
        adminUser: mockAdminUser as any,
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe(500);
      expect(res.error).toContain("Delhivery CMU API Timeout");
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  // --- 3. MARK RETURN RECEIVED TESTS ---
  describe("Domain Layer: markReturnReceived", () => {
    it("should update status from PROCESSING to COMPLETED and audit log RETURN_RECEIVED", async () => {
      const processingRequest = {
        ...mockApprovedReturnRequest,
        status: "PROCESSING" as const,
        waybill: "REV987654321",
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValue(processingRequest);

      const res = await markReturnReceived({
        requestId: mockRequestId,
        adminUser: mockAdminUser as any,
      });

      expect(res.success).toBe(true);
      expect(res.returnRequest.status).toBe("COMPLETED");
      expect(db.update).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });

    it("should reject marking as received for already COMPLETED or REJECTED requests", async () => {
      const completedRequest = {
        ...mockApprovedReturnRequest,
        status: "COMPLETED" as const,
      };

      (db.query.returnRequests.findFirst as any).mockResolvedValue(completedRequest);

      const res = await markReturnReceived({
        requestId: mockRequestId,
        adminUser: mockAdminUser as any,
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain("cannot be marked as received");
    });
  });
});
