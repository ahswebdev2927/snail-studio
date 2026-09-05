// @ts-nocheck
import { describe, it, expect, vi } from "vitest";
import { areAddressesEqual, getAddressSignature } from "@/lib/validators/address";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/schema", () => ({
  shipments: {},
  trackingEvents: {},
  orderStatusHistory: {},
}));

import { getNotificationRecipients } from "../tracking-sync.service";


describe("Address Verification & Comparison Utilities", () => {
  const baseAddr = {
    name: "Jane Doe",
    phone: "+919876543210",
    addressLine1: "Flat 402, Emerald Residency",
    addressLine2: "Sector 14, Palm Beach",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400063",
    country: "India",
  };

  it("should return true when comparing identical address objects", () => {
    expect(areAddressesEqual(baseAddr, { ...baseAddr })).toBe(true);
  });

  it("should ignore case and leading/trailing whitespace differences during comparison", () => {
    const variedAddr = {
      name: "  jane doe ",
      phone: "+919876543210 ",
      addressLine1: "FLAT 402, emerald residency",
      addressLine2: " sector 14, palm beach  ",
      city: "MUMBAI ",
      state: "maharashtra",
      postalCode: "400063",
      country: "INDIA",
    };
    expect(areAddressesEqual(baseAddr, variedAddr)).toBe(true);
  });

  it("should return false if pincode is changed", () => {
    const changedPin = { ...baseAddr, postalCode: "400064" };
    expect(areAddressesEqual(baseAddr, changedPin)).toBe(false);
  });

  it("should return false if flat/building addressLine1 is changed", () => {
    const changedLine1 = { ...baseAddr, addressLine1: "Flat 403, Emerald Residency" };
    expect(areAddressesEqual(baseAddr, changedLine1)).toBe(false);
  });

  it("should return false if phone number is changed", () => {
    const changedPhone = { ...baseAddr, phone: "+919876543211" };
    expect(areAddressesEqual(baseAddr, changedPhone)).toBe(false);
  });

  it("should return false if either address object is missing or null", () => {
    expect(areAddressesEqual(baseAddr, null)).toBe(false);
    expect(areAddressesEqual(undefined, baseAddr)).toBe(false);
  });

  it("should compute deterministic signature strings for checkout step caching", () => {
    const sig1 = getAddressSignature(baseAddr);
    const sig2 = getAddressSignature({ ...baseAddr });
    const sigDifferent = getAddressSignature({ ...baseAddr, postalCode: "400064" });

    expect(sig1).toBe(sig2);
    expect(sig1).not.toBe(sigDifferent);
    expect(typeof sig1).toBe("string");
    expect(sig1.length).toBeGreaterThan(0);
  });
});

describe("Shipping Notification Recipient Matrix", () => {
  it("should route in_transit and out_for_delivery exclusively to customer email", () => {
    const customer = "shopper@snailstudio.in";
    const admin = "admin@snailstudio.in";

    const inTransitRecipients = getNotificationRecipients("in_transit", customer, admin);
    expect(inTransitRecipients).toEqual([customer]);

    const outForDeliveryRecipients = getNotificationRecipients("out_for_delivery", customer, admin);
    expect(outForDeliveryRecipients).toEqual([customer]);
  });

  it("should route delivered and ndr to BOTH customer and admin emails", () => {
    const customer = "shopper@snailstudio.in";
    const admin = "admin@snailstudio.in";

    const deliveredRecipients = getNotificationRecipients("delivered", customer, admin);
    expect(deliveredRecipients).toEqual([customer, admin]);

    const ndrRecipients = getNotificationRecipients("ndr", customer, admin);
    expect(ndrRecipients).toEqual([customer, admin]);
  });

  it("should route rto exclusively to admin email", () => {
    const customer = "shopper@snailstudio.in";
    const admin = "admin@snailstudio.in";

    const rtoRecipients = getNotificationRecipients("rto", customer, admin);
    expect(rtoRecipients).toEqual([admin]);
  });
});
