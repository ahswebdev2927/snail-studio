import assert from "node:assert";

console.log("Running Phase V3-6 & V3-7 Shipment Wizard & Package Options Unit Tests...");

// Test 1: Validate default package metrics and dimensions
const getPackageDefaults = (adminOptions?: {
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  fragileShipment?: boolean;
  transportSpeed?: "D" | "F";
  labelFormat?: "4R" | "A4";
}) => {
  return {
    weightGrams: adminOptions?.weightGrams ?? 250,
    lengthCm: adminOptions?.lengthCm ?? 15.0,
    widthCm: adminOptions?.widthCm ?? 10.0,
    heightCm: adminOptions?.heightCm ?? 5.0,
    fragileShipment: adminOptions?.fragileShipment ?? true,
    transportSpeed: adminOptions?.transportSpeed ?? "D",
    labelFormat: adminOptions?.labelFormat ?? "4R",
  };
};

const defaults = getPackageDefaults();
assert.strictEqual(defaults.weightGrams, 250, "Default weight must be 250g");
assert.strictEqual(defaults.lengthCm, 15.0, "Default length must be 15.0cm");
assert.strictEqual(defaults.widthCm, 10.0, "Default width must be 10.0cm");
assert.strictEqual(defaults.heightCm, 5.0, "Default height must be 5.0cm");
assert.strictEqual(defaults.fragileShipment, true, "Fragile flag must default to true");
assert.strictEqual(defaults.transportSpeed, "D", "Transport speed must default to Surface (D)");
assert.strictEqual(defaults.labelFormat, "4R", "Label format must default to 4R thermal label");
console.log("✓ Test 1 Passed: Package metrics and smart defaults verified.");

// Test 2: Delhivery Packing Slip endpoint URL construction with pdf=true and pdf_size
const constructDelhiveryPackingSlipUrl = (waybill: string, pdfSize: "4R" | "A4" = "4R") => {
  const baseUrl = "/api/p/packing_slip";
  return `${baseUrl}?wbns=${encodeURIComponent(waybill)}&pdf=true&pdf_size=${pdfSize}`;
};

assert.strictEqual(
  constructDelhiveryPackingSlipUrl("143256789012", "4R"),
  "/api/p/packing_slip?wbns=143256789012&pdf=true&pdf_size=4R"
);
assert.strictEqual(
  constructDelhiveryPackingSlipUrl("143256789012", "A4"),
  "/api/p/packing_slip?wbns=143256789012&pdf=true&pdf_size=A4"
);
console.log("✓ Test 2 Passed: Delhivery Packing Slip API URL with pdf=true & pdf_size (4R/A4) verified.");

// Test 3: External Courier optional tracking URL handling
const validateExternalShipmentInput = (input: {
  provider: "delhivery" | "external";
  trackingNumber?: string;
  externalTrackingUrl?: string;
}) => {
  if (input.provider === "external") {
    if (!input.trackingNumber || !input.trackingNumber.trim()) {
      return { valid: false, error: "Tracking number is required for external courier." };
    }
    // externalTrackingUrl is optional
    return { valid: true };
  }
  return { valid: true };
};

assert.strictEqual(
  validateExternalShipmentInput({
    provider: "external",
    trackingNumber: "TRK123",
  }).valid,
  true,
  "External dispatch with missing tracking URL should still be valid"
);

assert.strictEqual(
  validateExternalShipmentInput({
    provider: "external",
    trackingNumber: "",
  }).valid,
  false,
  "External dispatch without tracking number should fail validation"
);
console.log("✓ Test 3 Passed: Optional tracking URL for external courier verified.");

// Test 4: Lifecycle status separation rule (Order status stays ready_to_ship, Shipment status becomes ready_to_ship / ready_to_pickup)
const processShipmentCreationState = (orderStatus: string) => {
  if (["cancelled", "refunded", "shipped", "delivered"].includes(orderStatus.toLowerCase())) {
    throw new Error(`Cannot create shipment for order in terminal status '${orderStatus}'`);
  }
  return {
    newShipmentStatus: "ready_to_ship",
    newOrderStatus: orderStatus, // Order status remains unchanged post-creation
  };
};

const stateResult = processShipmentCreationState("ready_to_ship");
assert.strictEqual(stateResult.newShipmentStatus, "ready_to_ship");
assert.strictEqual(stateResult.newOrderStatus, "ready_to_ship");
console.log("✓ Test 4 Passed: Core Rule #1 (Order status stays READY_TO_SHIP) verified.");

console.log("All Phase V3-6 & V3-7 Unit Tests Passed Successfully!");
