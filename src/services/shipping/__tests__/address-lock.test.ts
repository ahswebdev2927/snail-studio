import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkAddressLockStatus, validatePincodeServiceability } from "../shipping-policy.service";

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
  getSystemSettingsMap: vi.fn().mockResolvedValue({}),
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
    },
  },
}));

// Mock shipping provider factory
vi.mock("@/lib/shipping", () => ({
  getShippingProvider: vi.fn().mockReturnValue({
    checkServiceability: vi.fn().mockImplementation(({ destinationPincode }) => {
      if (destinationPincode === "000000" || destinationPincode === "999999") {
        return Promise.resolve({ isServiceable: false, remarks: "Non-serviceable pincode" });
      }
      return Promise.resolve({ isServiceable: true });
    }),
  }),
}));

import { db } from "@/db";

describe("Address Locking & Serviceability Policy", () => {
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
});
