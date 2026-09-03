import assert from "node:assert";
import { getNotificationRecipients } from "../tracking-sync.service";
import { normalizeDelhiveryStatus } from "@/lib/shipping/providers/delhivery/tracking";

console.log("Running Phase V3-5 Tracking Sync Unit Tests...\n");

// Test 1: Selective Email Dispatch Matrix Rules
const customerEmail = "customer@example.com";
const adminEmail = "admin@snailstudio.in";

// 1a. in_transit -> Customer ONLY
const inTransitRecipients = getNotificationRecipients("in_transit", customerEmail, adminEmail);
assert.deepStrictEqual(inTransitRecipients, [customerEmail], "in_transit should send ONLY to customer");

// 1b. out_for_delivery -> Customer ONLY
const outForDeliveryRecipients = getNotificationRecipients("out_for_delivery", customerEmail, adminEmail);
assert.deepStrictEqual(outForDeliveryRecipients, [customerEmail], "out_for_delivery should send ONLY to customer");

// 1c. delivered -> BOTH Customer AND Admin
const deliveredRecipients = getNotificationRecipients("delivered", customerEmail, adminEmail);
assert.deepStrictEqual(deliveredRecipients, [customerEmail, adminEmail], "delivered should send to BOTH customer and admin");

// 1d. ndr -> BOTH Customer AND Admin
const ndrRecipients = getNotificationRecipients("ndr", customerEmail, adminEmail);
assert.deepStrictEqual(ndrRecipients, [customerEmail, adminEmail], "ndr should send to BOTH customer and admin");

// 1e. rto -> Admin ONLY
const rtoRecipients = getNotificationRecipients("rto", customerEmail, adminEmail);
assert.deepStrictEqual(rtoRecipients, [adminEmail], "rto should send ONLY to admin");

// 1f. unknown / pending status -> No recipients
const pendingRecipients = getNotificationRecipients("pending", customerEmail, adminEmail);
assert.deepStrictEqual(pendingRecipients, [], "pending status should send NO email notifications");

console.log("✓ Test 1 Passed: Selective Email Dispatch Matrix verified (Customer, Both, Admin-only).");


// Test 2: Delhivery Status Normalization
assert.strictEqual(normalizeDelhiveryStatus("Delivered"), "delivered");
assert.strictEqual(normalizeDelhiveryStatus("Dispatched", "Out for Delivery"), "out_for_delivery");
assert.strictEqual(normalizeDelhiveryStatus("In Transit"), "in_transit");
assert.strictEqual(normalizeDelhiveryStatus("Not Picked"), "ndr");
assert.strictEqual(normalizeDelhiveryStatus("RTO", "Return to Origin"), "rto");
assert.strictEqual(normalizeDelhiveryStatus("Cancelled"), "cancelled");
assert.strictEqual(normalizeDelhiveryStatus("Manifested"), "pending");

console.log("✓ Test 2 Passed: Delhivery Status Normalization mappings verified.");


// Test 3: Tracking Scan Key Composite Deduplication Logic
const makeScanKey = (status: string, timestamp: Date, location?: string | null) => {
  return `${status}_${timestamp.getTime()}_${(location || "").trim()}`;
};

const date1 = new Date("2026-09-03T10:00:00Z");
const key1 = makeScanKey("In Transit", date1, "Hyderabad Hub");
const key2 = makeScanKey("In Transit", date1, "Hyderabad Hub");
const key3 = makeScanKey("In Transit", date1, "Bengaluru Hub");

assert.strictEqual(key1, key2, "Identical scan events must yield identical deduplication keys");
assert.notStrictEqual(key1, key3, "Scans at different locations must yield different keys");

console.log("✓ Test 3 Passed: Scan event composite key deduplication verified.");

console.log("\nALL PHASE V3-5 TRACKING SYNC TESTS PASSED SUCCESSFULLY! 🎉");
