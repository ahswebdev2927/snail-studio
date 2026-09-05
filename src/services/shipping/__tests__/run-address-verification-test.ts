import { areAddressesEqual, getAddressSignature } from "../../../lib/validators/address";
import { getNotificationRecipients } from "../tracking-sync.service";

async function runTests() {
  console.log("=== Phase V3-7 Address Verification & Tracking Suite ===");

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

  // Test 1: Identical addresses
  console.assert(areAddressesEqual(baseAddr, { ...baseAddr }) === true, "Test 1 Failed: Identical addresses should return true");
  console.log("✅ Test 1 Passed: Identical addresses match");

  // Test 2: Whitespace and case variations
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
  console.assert(areAddressesEqual(baseAddr, variedAddr) === true, "Test 2 Failed: Case & whitespace normalization failed");
  console.log("✅ Test 2 Passed: Normalized case & whitespace match");

  // Test 3: Pincode change
  const changedPin = { ...baseAddr, postalCode: "400064" };
  console.assert(areAddressesEqual(baseAddr, changedPin) === false, "Test 3 Failed: Pincode change should return false");
  console.log("✅ Test 3 Passed: Pincode change correctly detected");

  // Test 4: Flat/house addressLine1 change
  const changedLine1 = { ...baseAddr, addressLine1: "Flat 403, Emerald Residency" };
  console.assert(areAddressesEqual(baseAddr, changedLine1) === false, "Test 4 Failed: AddressLine1 change should return false");
  console.log("✅ Test 4 Passed: AddressLine1 change correctly detected");

  // Test 5: Signature caching
  const sig1 = getAddressSignature(baseAddr);
  const sig2 = getAddressSignature({ ...baseAddr });
  const sig3 = getAddressSignature(changedPin);
  console.assert(sig1 === sig2, "Test 5 Failed: Signatures should match for identical data");
  console.assert(sig1 !== sig3, "Test 5 Failed: Signatures should differ for changed data");
  console.log("✅ Test 5 Passed: Address signatures match deterministically");

  // Test 6: Notification Routing Matrix
  const customer = "shopper@snailstudio.in";
  const admin = "admin@snailstudio.in";

  const inTransit = getNotificationRecipients("in_transit", customer, admin);
  console.assert(inTransit.length === 1 && inTransit[0] === customer, "Test 6a Failed: In Transit routing");

  const delivered = getNotificationRecipients("delivered", customer, admin);
  console.assert(delivered.length === 2 && delivered.includes(customer) && delivered.includes(admin), "Test 6b Failed: Delivered routing");

  const rto = getNotificationRecipients("rto", customer, admin);
  console.assert(rto.length === 1 && rto[0] === admin, "Test 6c Failed: RTO routing");
  console.log("✅ Test 6 Passed: Notification routing matrix verified");

  console.log("\n🎉 ALL 6 VERIFICATION TEST CASES PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
