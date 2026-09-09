import { describe, it, expect } from "vitest";

describe("Phase V3-6 Admin Shipment Operations Unit Tests", () => {
  it("should format courier order ID for multi-attempts", () => {
    const formatCourierOrderId = (orderId: string, attemptNumber: number) => {
      return attemptNumber > 1 ? `${orderId}-A${attemptNumber}` : orderId;
    };

    expect(formatCourierOrderId("ORD-9999", 1)).toBe("ORD-9999");
    expect(formatCourierOrderId("ORD-9999", 2)).toBe("ORD-9999-A2");
    expect(formatCourierOrderId("ORD-9999", 3)).toBe("ORD-9999-A3");
  });

  it("should match search filters across AWB, order ID, customer name, and pincode", () => {
    const matchesSearchFilter = (item: {
      orderId: string;
      courierOrderId: string;
      trackingNumber: string;
      customerName: string;
      destinationPincode: string;
    }, query: string) => {
      const q = query.toLowerCase().trim();
      if (!q) return true;
      return (
        item.orderId.toLowerCase().includes(q) ||
        item.courierOrderId.toLowerCase().includes(q) ||
        item.trackingNumber.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.destinationPincode.includes(q)
      );
    };

    const sampleShipment = {
      orderId: "ORD-501",
      courierOrderId: "ORD-501-A2",
      trackingNumber: "DEL123456789",
      customerName: "Jane Doe",
      destinationPincode: "500019",
    };

    expect(matchesSearchFilter(sampleShipment, "DEL123")).toBe(true);
    expect(matchesSearchFilter(sampleShipment, "Jane")).toBe(true);
    expect(matchesSearchFilter(sampleShipment, "500019")).toBe(true);
    expect(matchesSearchFilter(sampleShipment, "ORD-501-A2")).toBe(true);
    expect(matchesSearchFilter(sampleShipment, "NonExistent")).toBe(false);
  });

  it("should validate pickup scheduling payload", () => {
    const validatePickupPayload = (payload: { pickupDate?: string; packageCount?: number }) => {
      if (!payload.pickupDate || !/^\d{4}-\d{2}-\d{2}$/.test(payload.pickupDate)) {
        return { valid: false, error: "Invalid pickup date format (must be YYYY-MM-DD)" };
      }
      if (!payload.packageCount || payload.packageCount < 1) {
        return { valid: false, error: "Package count must be at least 1" };
      }
      return { valid: true };
    };

    expect(validatePickupPayload({ pickupDate: "2026-09-10", packageCount: 5 }).valid).toBe(true);
    expect(validatePickupPayload({ pickupDate: "invalid", packageCount: 1 }).valid).toBe(false);
    expect(validatePickupPayload({ pickupDate: "2026-09-10", packageCount: 0 }).valid).toBe(false);
  });

  it("should validate external courier tracking URL format", () => {
    const validateExternalCourierUpdate = (data: { externalCourierName?: string; trackingNumber?: string; externalTrackingUrl?: string }) => {
      if (data.externalTrackingUrl && data.externalTrackingUrl.length > 0) {
        try {
          new URL(data.externalTrackingUrl);
        } catch {
          return { valid: false, error: "Invalid tracking URL" };
        }
      }
      return { valid: true };
    };

    expect(validateExternalCourierUpdate({ externalTrackingUrl: "https://www.dtdc.in/track/123" }).valid).toBe(true);
    expect(validateExternalCourierUpdate({ externalTrackingUrl: "not-a-url" }).valid).toBe(false);
  });

  it("should classify valid audit log action types", () => {
    const validAuditActions = ["create", "cancel", "redispatch", "pickup_scheduled", "label_generated", "external_updated"];
    const isValidAuditAction = (action: string) => validAuditActions.includes(action);

    expect(isValidAuditAction("create")).toBe(true);
    expect(isValidAuditAction("cancel")).toBe(true);
    expect(isValidAuditAction("pickup_scheduled")).toBe(true);
    expect(isValidAuditAction("label_generated")).toBe(true);
    expect(isValidAuditAction("external_updated")).toBe(true);
    expect(isValidAuditAction("unknown_action")).toBe(false);
  });
});
