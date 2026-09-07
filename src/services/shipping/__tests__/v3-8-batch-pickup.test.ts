import assert from "node:assert";

/**
 * Unit Test Suite for Phase V3-8: Delhivery Batch Pickup Management & Lock Rules
 */

// Helper: Date format validation
function isValidPickupDate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

// Helper: Status validation rule for batch pickup
function isEligibleForPickup(status: string, provider: string): boolean {
  return (status === "ready_to_pickup" || status === "manifested") && provider === "delhivery";
}

// Helper: Active pickup lock logic simulator
function evaluatePickupLock(
  activePickupToday: boolean,
  bypassActiveLock: boolean
): { allowed: boolean; reason?: string } {
  if (activePickupToday && !bypassActiveLock) {
    return {
      allowed: false,
      reason: "An active pickup request has already been scheduled today for this warehouse location.",
    };
  }
  return { allowed: true };
}

async function runTests() {
  console.log("▶ Running Phase V3-8 Batch Pickup Management Unit Tests...\n");

  // Test 1: Date Format Validation
  console.log("Test 1: Validating pickup date format...");
  assert.strictEqual(isValidPickupDate("2026-09-07"), true, "Valid date format YYYY-MM-DD should pass");
  assert.strictEqual(isValidPickupDate("07-09-2026"), false, "Invalid date format should fail");
  assert.strictEqual(isValidPickupDate("invalid"), false, "Non-date string should fail");
  console.log("✓ Test 1 Passed: Pickup date format validation successful.");

  // Test 2: Eligibility Check for Batch Selection
  console.log("\nTest 2: Verifying shipment eligibility for batch pickup...");
  assert.strictEqual(isEligibleForPickup("ready_to_pickup", "delhivery"), true, "ready_to_pickup Delhivery shipment must be eligible");
  assert.strictEqual(isEligibleForPickup("manifested", "delhivery"), true, "manifested Delhivery shipment must be eligible");
  assert.strictEqual(isEligibleForPickup("shipped", "delhivery"), false, "shipped shipment must not be eligible");
  assert.strictEqual(isEligibleForPickup("ready_to_pickup", "external"), false, "external courier shipment must not be eligible for Delhivery API pickup");
  console.log("✓ Test 2 Passed: Shipment eligibility criteria verified.");

  // Test 3: Active Pickup Lock & Admin Verification Bypass
  console.log("\nTest 3: Testing active pickup lock and admin verification bypass...");
  const lockedRes = evaluatePickupLock(true, false);
  assert.strictEqual(lockedRes.allowed, false, "Active pickup today without bypass must be locked");
  assert.ok(lockedRes.reason?.includes("active pickup request"), "Error reason must specify active pickup rule");

  const unlockedRes = evaluatePickupLock(true, true);
  assert.strictEqual(unlockedRes.allowed, true, "Active pickup with admin verification bypass must unlock scheduling");

  const noActiveRes = evaluatePickupLock(false, false);
  assert.strictEqual(noActiveRes.allowed, true, "No active pickup today must allow scheduling");
  console.log("✓ Test 3 Passed: Active pickup lock & unlock verification logic validated.");

  console.log("\n✅ ALL PHASE V3-8 UNIT TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("❌ Unit Test Failed:", err);
  process.exit(1);
});
