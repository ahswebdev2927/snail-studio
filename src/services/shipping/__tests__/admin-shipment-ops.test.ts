import assert from "node:assert";

console.log("Running Phase V3-6 Admin Shipment Operations Unit Tests...");

// Test 1: Courier Order ID attempt formatting (Attempt #1 = ord_123, Attempt #2 = ord_123-A2)
const formatCourierOrderId = (orderId: string, attemptNumber: number) => {
  return attemptNumber > 1 ? `${orderId}-A${attemptNumber}` : orderId;
};

assert.strictEqual(formatCourierOrderId("ORD-9999", 1), "ORD-9999");
assert.strictEqual(formatCourierOrderId("ORD-9999", 2), "ORD-9999-A2");
assert.strictEqual(formatCourierOrderId("ORD-9999", 3), "ORD-9999-A3");
console.log("✓ Test 1 Passed: Courier Order ID multi-attempt formatting verified.");

// Test 2: Search filter matcher for AWB, Order ID, Customer Name, and Pincode
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

assert.strictEqual(matchesSearchFilter(sampleShipment, "DEL123"), true);
assert.strictEqual(matchesSearchFilter(sampleShipment, "Jane"), true);
assert.strictEqual(matchesSearchFilter(sampleShipment, "500019"), true);
assert.strictEqual(matchesSearchFilter(sampleShipment, "ORD-501-A2"), true);
assert.strictEqual(matchesSearchFilter(sampleShipment, "NonExistent"), false);
console.log("✓ Test 2 Passed: Admin shipment search filter matcher verified.");

// Test 3: Pickup schedule payload validator
const validatePickupPayload = (payload: { pickupDate?: string; packageCount?: number }) => {
  if (!payload.pickupDate || !/^\d{4}-\d{2}-\d{2}$/.test(payload.pickupDate)) {
    return { valid: false, error: "Invalid pickup date format (must be YYYY-MM-DD)" };
  }
  if (!payload.packageCount || payload.packageCount < 1) {
    return { valid: false, error: "Package count must be at least 1" };
  }
  return { valid: true };
};

assert.strictEqual(validatePickupPayload({ pickupDate: "2026-09-10", packageCount: 5 }).valid, true);
assert.strictEqual(validatePickupPayload({ pickupDate: "invalid", packageCount: 1 }).valid, false);
assert.strictEqual(validatePickupPayload({ pickupDate: "2026-09-10", packageCount: 0 }).valid, false);
console.log("✓ Test 3 Passed: Pickup scheduling payload validation verified.");

// Test 4: External courier update validation
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

assert.strictEqual(validateExternalCourierUpdate({ externalTrackingUrl: "https://www.dtdc.in/track/123" }).valid, true);
assert.strictEqual(validateExternalCourierUpdate({ externalTrackingUrl: "not-a-url" }).valid, false);
console.log("✓ Test 4 Passed: External courier tracking URL validator verified.");

// Test 5: Audit log action type classification
const validAuditActions = ["create", "cancel", "redispatch", "pickup_scheduled", "label_generated", "external_updated"];
const isValidAuditAction = (action: string) => validAuditActions.includes(action);

assert.strictEqual(isValidAuditAction("create"), true);
assert.strictEqual(isValidAuditAction("cancel"), true);
assert.strictEqual(isValidAuditAction("pickup_scheduled"), true);
assert.strictEqual(isValidAuditAction("label_generated"), true);
assert.strictEqual(isValidAuditAction("external_updated"), true);
assert.strictEqual(isValidAuditAction("unknown_action"), false);
console.log("✓ Test 5 Passed: Audit log action type classification verified.");

console.log("\nALL PHASE V3-6 ADMIN SHIPMENT OPERATIONS TESTS PASSED SUCCESSFULLY! 🎉");
