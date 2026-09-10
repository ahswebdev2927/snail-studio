import { describe, it, expect } from "vitest";

describe("Phase V3-22 Add to Active Pickup Request Unit Tests", () => {
  function validateAddToActiveRequest(shipmentIds: string[]): {
    allowed: boolean;
    error?: string;
  } {
    if (shipmentIds.length === 0) {
      return {
        allowed: false,
        error: "Please select at least 1 shipment to add to the active pickup request.",
      };
    }

    if (shipmentIds.length > 3) {
      return {
        allowed: false,
        error:
          "Cannot add more than 3 Shipments to an active/pending Pickup request, please request for another time or after the pickup request is resolved",
      };
    }

    return { allowed: true };
  }

  it("should allow adding 1 shipment to active pickup request", () => {
    const res = validateAddToActiveRequest(["ship_1"]);
    expect(res.allowed).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it("should allow adding up to 3 shipments to active pickup request", () => {
    const res2 = validateAddToActiveRequest(["ship_1", "ship_2"]);
    expect(res2.allowed).toBe(true);

    const res3 = validateAddToActiveRequest(["ship_1", "ship_2", "ship_3"]);
    expect(res3.allowed).toBe(true);
  });

  it("should reject adding 4 or more shipments with exact error message", () => {
    const res4 = validateAddToActiveRequest(["ship_1", "ship_2", "ship_3", "ship_4"]);
    expect(res4.allowed).toBe(false);
    expect(res4.error).toBe(
      "Cannot add more than 3 Shipments to an active/pending Pickup request, please request for another time or after the pickup request is resolved"
    );

    const res5 = validateAddToActiveRequest(["ship_1", "ship_2", "ship_3", "ship_4", "ship_5"]);
    expect(res5.allowed).toBe(false);
    expect(res5.error).toBe(
      "Cannot add more than 3 Shipments to an active/pending Pickup request, please request for another time or after the pickup request is resolved"
    );
  });

  it("should require at least 1 shipment selected", () => {
    const resEmpty = validateAddToActiveRequest([]);
    expect(resEmpty.allowed).toBe(false);
    expect(resEmpty.error).toContain("at least 1 shipment");
  });
});
