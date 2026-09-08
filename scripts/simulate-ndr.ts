import fs from "node:fs";

// Load .env variables into process.env BEFORE importing database client
if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

/**
 * Helper script to simulate carrier NDR, Pickup Exception, or Delivery events
 * offline without making external HTTP calls to Delhivery APIs.
 * Automatically creates a test shipment record on the fly if one does not exist!
 * 
 * Works seamlessly for both Local SQLite and Turso Cloud DB!
 */
async function simulate() {
  // Dynamically import database client AFTER process.env is populated
  const { db } = await import("../src/db");
  const { shipments, orders, orderAddresses } = await import("../src/db/schema");
  const { eq, or } = await import("drizzle-orm");
  const { normalizeDelhiveryEvent } = await import("../src/lib/shipping/event-normalizer");
  const { processShipmentEventExceptions } = await import("../src/services/shipping/exception-engine");
  const { nanoid } = await import("nanoid");

  const provider = process.env.DB_PROVIDER || "sqlite";
  const args = process.argv.slice(2);
  const waybill = args[0] || "41093210944403";
  const nslCode = (args[1] || "EOD-11").toUpperCase();
  const instructions = args[2] || `Simulated event for code ${nslCode}`;

  console.log(`\n🌐 [Target DB Provider]: ${provider.toUpperCase()}`);
  console.log(`🧪 [Simulate NDR] Simulating offline carrier scan for Waybill/Order: "${waybill}" with NSL Code: "${nslCode}"...`);

  // Find shipment record by waybill, tracking number, courier order ID, or order ID
  let shipment = await db.query.shipments.findFirst({
    where: or(
      eq(shipments.waybill, waybill),
      eq(shipments.trackingNumber, waybill),
      eq(shipments.courierOrderId, waybill),
      eq(shipments.orderId, waybill)
    ),
  });

  // Automatically create a test order & shipment if no existing record matches
  if (!shipment) {
    console.log(`ℹ️  No existing shipment found for "${waybill}". Creating test Order and Shipment in ${provider.toUpperCase()}...`);
    const orderId = `ORD-TEST-${nanoid(6)}`;
    const now = new Date();

    await db.insert(orders).values({
      id: orderId,
      status: "shipped",
      totalAmount: 199900,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(orderAddresses).values({
      id: `addr_${nanoid(8)}`,
      orderId,
      type: "shipping",
      name: "Test Customer",
      phone: "+919876543210",
      addressLine1: "123 Test Street, Jubilee Hills",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500033",
      country: "India",
      createdAt: now,
      updatedAt: now,
    });

    const shipmentId = `ship_${nanoid(10)}`;
    await db.insert(shipments).values({
      id: shipmentId,
      orderId,
      carrier: "Delhivery",
      provider: "delhivery",
      courierOrderId: `DEL-${orderId}`,
      waybill,
      trackingNumber: waybill,
      status: "in_transit",
      createdAt: now,
      updatedAt: now,
    });

    shipment = await db.query.shipments.findFirst({
      where: eq(shipments.id, shipmentId),
    });

    console.log(`✨ Created Test Order: #${orderId} & Shipment ID: ${shipmentId} (AWB: ${waybill})`);
  }

  if (!shipment) {
    console.error(`❌ Unexpected error: Failed to retrieve or create test shipment.`);
    process.exit(1);
  }

  const rawScanPayload = {
    ScanDetail: {
      StatusCode: nslCode,
      Scan: nslCode === "EOD-135" ? "Delivered" : "Undelivered",
      Instructions: instructions,
      ScanDateTime: new Date().toISOString(),
      ScannedLocation: "Simulated Hub / Offline Test",
      DispatchCount: 1,
    },
  };

  const normalizedEvt = normalizeDelhiveryEvent(shipment.id, shipment.trackingNumber, rawScanPayload);
  const result = await processShipmentEventExceptions(normalizedEvt);

  console.log(`\n✅ [Simulation Complete in ${provider.toUpperCase()}] Result:`);
  console.log(`   - Order ID: #${shipment.orderId}`);
  console.log(`   - AWB / Tracking: ${shipment.trackingNumber}`);
  console.log(`   - Action Taken: ${result.actionTaken}`);
  console.log(`   - Exception ID: ${result.exceptionId || "N/A"}`);
  console.log(`   - Exception Type: ${result.exceptionType || "N/A"}`);
  console.log(`   - Shipment Status Cancelled: ${result.shipmentCancelled ? "YES (Status set to 'cancelled')" : "NO"}\n`);

  process.exit(0);
}

simulate().catch((err) => {
  console.error("Simulation failed:", err);
  process.exit(1);
});
