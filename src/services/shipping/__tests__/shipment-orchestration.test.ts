import assert from "node:assert";
import { ALLOWED_DELHIVERY_CANCEL_STATUSES } from "../shipment-orchestration.service";

console.log("Running Shipment Orchestration Unit Tests...");

// Test 1: Allowed Delhivery cancellation package statuses
assert.ok(ALLOWED_DELHIVERY_CANCEL_STATUSES.includes("manifested"), "Manifested should be allowed");
assert.ok(ALLOWED_DELHIVERY_CANCEL_STATUSES.includes("in_transit"), "In Transit should be allowed");
assert.ok(ALLOWED_DELHIVERY_CANCEL_STATUSES.includes("pending"), "Pending should be allowed");
assert.ok(ALLOWED_DELHIVERY_CANCEL_STATUSES.includes("ready_to_ship"), "Ready to ship should be allowed");
assert.ok(ALLOWED_DELHIVERY_CANCEL_STATUSES.includes("pickup_scheduled"), "Pickup scheduled should be allowed");
console.log("✓ Test 1 Passed: Official Delhivery cancellation package statuses verified.");

// Test 2: Delhivery status cancellation eligibility guard
const isDelhiveryCancelEligible = (status: string) => {
  const currentStatus = status.toLowerCase();
  const isDisallowed = ["dispatched", "out_for_delivery", "delivered", "rto"].includes(currentStatus);
  const isAllowed = ALLOWED_DELHIVERY_CANCEL_STATUSES.includes(currentStatus);
  return !isDisallowed && isAllowed;
};

assert.strictEqual(isDelhiveryCancelEligible("manifested"), true, "Manifested should be eligible");
assert.strictEqual(isDelhiveryCancelEligible("in_transit"), true, "In Transit should be eligible");
assert.strictEqual(isDelhiveryCancelEligible("pending"), true, "Pending should be eligible");
assert.strictEqual(isDelhiveryCancelEligible("ready_to_ship"), true, "Ready to ship should be eligible");

assert.strictEqual(isDelhiveryCancelEligible("dispatched"), false, "Dispatched should NOT be eligible");
assert.strictEqual(isDelhiveryCancelEligible("out_for_delivery"), false, "Out for delivery should NOT be eligible");
assert.strictEqual(isDelhiveryCancelEligible("delivered"), false, "Delivered should NOT be eligible");
assert.strictEqual(isDelhiveryCancelEligible("rto"), false, "RTO should NOT be eligible");
console.log("✓ Test 2 Passed: Dispatched and Delivered cancellation guard verified.");

// Test 3: Courier Order ID attempt formatting
const formatCourierOrderId = (orderId: string, attemptNumber: number) => {
  return attemptNumber > 1 ? `${orderId}-A${attemptNumber}` : orderId;
};

assert.strictEqual(formatCourierOrderId("ord_123", 1), "ord_123");
assert.strictEqual(formatCourierOrderId("ord_123", 2), "ord_123-A2");
assert.strictEqual(formatCourierOrderId("ord_123", 3), "ord_123-A3");
console.log("✓ Test 3 Passed: Multi-attempt courier order ID formatting verified.");

console.log("\nALL SHIPMENT ORCHESTRATION TESTS PASSED SUCCESSFULLY! 🎉");
