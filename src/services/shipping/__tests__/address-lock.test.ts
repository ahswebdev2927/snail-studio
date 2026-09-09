// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from "vitest";
import { 
  checkAddressLockStatus, 
  validatePincodeServiceability,
  validatePreShipment,
  recalculateShippingForOrder
} from "../shipping-policy.service";

// Mock schema layer
vi.mock("@/db/schema", () => ({
  orders: { id: "id" },
  orderAddresses: { id: "id" },
  orderAddressHistory: { id: "id" },
  shipments: { id: "id", orderId: "order_id", status: "status" },
  inventoryItems: { id: "id" },
  inventoryReservations: { id: "id" },
}));

// Mock system settings service
vi.mock("@/services/settings", () => ({
  getSystemSettingsMap: vi.fn().mockResolvedValue({
    shippingAdjustmentEnabled: "true",
    shippingAdjustmentMode: "automatic",
    ignoreShippingDifference: "true",
    ignoreDifferenceAmount: "50", // ₹50 threshold (5000 paise)
    defaultPrepaidShipping: "70",
    defaultCodShipping: "100",
    shippingRateProvider: "zone_rules",
  }),
}));

// Mock database layer
vi.mock("@/db", () => ({
  db: {
    query: {
      orders: {
        findFirst: vi.fn(),
      },
      shipments: {
        findFirst: vi.fn(),
      },
      inventoryItems: {
        findFirst: vi.fn().mockResolvedValue({ id: "inv_1", stockLevel: 10 }),
      },
      inventoryReservations: {
        findFirst: vi.fn().mockResolvedValue({ id: "res_1" }),
      },
    },
  },
}));

// Mock shipping provider factory
vi.mock("@/lib/shipping", () => ({
  getShippingProvider: vi.fn().mockReturnValue({
    checkServiceability: vi.fn().mockImplementation(({ pincode, destinationPincode }) => {
      const pin = pincode || destinationPincode;
      if (pin === "000000" || pin === "999999") {
        return Promise.resolve({ isServiceable: false, remarks: "Non-serviceable pincode" });
      }
      return Promise.resolve({ isServiceable: true });
    }),
  }),
}));

import { db } from "@/db";

describe("Address Locking, Serviceability & Shipping Adjustment Policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkAddressLockStatus", () => {
    it("should return locked: false when no shipment exists and order status is active", async () => {
      (db.query.orders.findFirst as any).mockResolvedValue({
        id: "ord_123",
        status: "processing",
      });
      (db.query.shipments.findFirst as any).mockResolvedValue(null);

      const result = await checkAddressLockStatus("ord_123");
      expect(result.locked).toBe(false);
    });

    it("should return locked: true when a shipment (AWB) already exists", async () => {
      (db.query.orders.findFirst as any).mockResolvedValue({
        id: "ord_123",
        status: "processing",
      });
      (db.query.shipments.findFirst as any).mockResolvedValue({
        id: "ship_123",
        trackingNumber: "TRK123456",
        status: "ready_to_ship",
      });

      const result = await checkAddressLockStatus("ord_123");
      expect(result.locked).toBe(true);
      expect(result.reason).toContain("A shipment (AWB) has already been created");
    });

    it("should return locked: true when order is in terminal status (shipped/delivered)", async () => {
      (db.query.orders.findFirst as any).mockResolvedValue({
        id: "ord_123",
        status: "shipped",
      });
      (db.query.shipments.findFirst as any).mockResolvedValue(null);

      const result = await checkAddressLockStatus("ord_123");
      expect(result.locked).toBe(true);
      expect(result.reason).toContain("Order is in status 'shipped'");
    });

    it("should return locked: true if order does not exist", async () => {
      (db.query.orders.findFirst as any).mockResolvedValue(null);

      const result = await checkAddressLockStatus("ord_nonexistent");
      expect(result.locked).toBe(true);
      expect(result.reason).toBe("Order not found.");
    });
  });

  describe("validatePincodeServiceability", () => {
    it("should return serviceable: true for valid pincodes", async () => {
      const result = await validatePincodeServiceability("400001");
      expect(result.serviceable).toBe(true);
    });

    it("should return serviceable: false for invalid or unserviceable pincodes", async () => {
      const invalidPincode = await validatePincodeServiceability("123");
      expect(invalidPincode.serviceable).toBe(false);

      const unserviceable = await validatePincodeServiceability("999999");
      expect(unserviceable.serviceable).toBe(false);
      expect(unserviceable.message).toContain("Non-serviceable pincode");
    });
  });

  describe("validatePreShipment Shipment Guard", () => {
    it("should block shipment creation when shippingDifferenceStatus === 'pending'", async () => {
      (db.query.orders.findFirst as any).mockResolvedValue({
        id: "ord_123",
        status: "processing",
        shippingCalculatedAt: new Date(),
        shippingDifferenceStatus: "pending",
        addresses: [{ type: "shipping", postalCode: "400001", city: "Mumbai", state: "Maharashtra" }],
        items: [{ variantId: "var_1", quantity: 1 }],
        payments: [{ status: "succeeded" }],
      });

      const validation = await validatePreShipment("ord_123");
      expect(validation.success).toBe(false);
      expect(validation.errors).toContain("Shipping adjustment payment is pending from the customer.");
    });

    it("should allow shipment creation when shippingDifferenceStatus === 'waived' or 'paid'", async () => {
      (db.query.orders.findFirst as any).mockResolvedValue({
        id: "ord_123",
        status: "processing",
        shippingAmount: 0,
        shippingCalculatedAt: new Date(),
        shippingDifferenceStatus: "waived",
        addresses: [{ type: "shipping", postalCode: "400001", city: "Mumbai", state: "Maharashtra" }],
        items: [{ variantId: "var_1", quantity: 1 }],
        payments: [{ status: "succeeded" }],
      });

      const validation = await validatePreShipment("ord_123");
      expect(validation.success).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe("recalculateShippingForOrder Absorb Threshold & Baseline Consistency", () => {
    it("should set shippingDifferenceStatus to 'waived' when difference is within absorb limit (<= ₹50)", async () => {
      (db.query.orders.findFirst as any).mockResolvedValue({
        id: "ord_123",
        shippingAmount: 5000, // ₹50 original baseline
        shippingChargePaid: 5000,
        currentShippingCharge: 5000,
        shippingDifference: 0,
        shippingCalculatedAt: null,
        payments: [{ status: "succeeded" }],
      });

      // Recalculate for Delhi NCR (₹70 = 7000 paise, difference = 7000 - 5000 = +2000 paise = ₹20 <= ₹50 limit)
      const res = await recalculateShippingForOrder("ord_123", {
        addressLine1: "Connaught Place",
        city: "New Delhi",
        state: "Delhi",
        postalCode: "110001",
        country: "India",
      });

      expect(res.shippingDifference).toBe(2000); // ₹20
      expect(res.absorbAmount).toBe(2000);
      expect(res.shippingDifferenceStatus).toBe("waived");
      expect(res.totalAmountAdjustment).toBe(0);
    });

    it("should set shippingDifferenceStatus to 'pending' when difference exceeds absorb limit (> ₹50)", async () => {
      (db.query.orders.findFirst as any).mockResolvedValue({
        id: "ord_123",
        shippingAmount: 5000, // ₹50 original baseline
        shippingChargePaid: 5000,
        currentShippingCharge: 5000,
        shippingDifference: 0,
        shippingCalculatedAt: null,
        payments: [{ status: "succeeded" }],
      });

      // Recalculate for Rest of India (₹120 = 12000 paise, difference = 12000 - 5000 = +7000 paise = ₹70 > ₹50 limit)
      const res = await recalculateShippingForOrder("ord_123", {
        addressLine1: "Mall Road",
        city: "Shimla",
        state: "Himachal Pradesh",
        postalCode: "171001",
        country: "India",
      });

      expect(res.shippingDifference).toBe(7000); // ₹70
      expect(res.absorbAmount).toBe(5000); // ₹50 absorbed
      expect(res.shippingDifferenceStatus).toBe("pending");
      expect(res.totalAmountAdjustment).toBe(2000); // ₹20 net balance due
    });

    it("should maintain baseline consistency on repeated address changes", async () => {
      // Order originally placed with ₹50 shipping baseline. After address edit #1, currentShippingCharge is ₹70 and shippingDifference is ₹20.
      (db.query.orders.findFirst as any).mockResolvedValue({
        id: "ord_123",
        shippingAmount: 5000, // original baseline ₹50
        shippingChargePaid: 5000,
        currentShippingCharge: 7000, // current rate after edit #1 (₹70)
        shippingDifference: 2000,   // difference from original baseline (₹20)
        shippingCalculatedAt: new Date(),
        payments: [{ status: "succeeded" }],
      });

      // Address edit #2 to Rest of India zone (₹120 rate)
      const res = await recalculateShippingForOrder("ord_123", {
        addressLine1: "Mall Road",
        city: "Shimla",
        state: "Himachal Pradesh",
        postalCode: "171001",
        country: "India",
      });

      // Baseline should evaluate back to original customer paid charge: 7000 - 2000 = 5000 (₹50)
      // Difference from baseline = 12000 - 5000 = 7000 paise (₹70)
      expect(res.shippingDifference).toBe(7000);
      expect(res.absorbAmount).toBe(5000);
      expect(res.shippingDifferenceStatus).toBe("pending");
      expect(res.totalAmountAdjustment).toBe(2000); // 7000 - 5000 = 2000 paise
    });
  });
});
