import { db } from "@/db";
import { shipments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { syncActiveShipments } from "@/services/shipping/tracking-sync.service";
import { normalizeDelhiveryStatus } from "@/lib/shipping/providers/delhivery/tracking";

async function main() {
  console.log("=== Testing Delhivery Tracking Status Normalization ===");
  const rawStatus = "In Transit";
  const instructions = "Shipment picked up";
  const statusCode = "X-PPOM";

  const normalized = normalizeDelhiveryStatus(rawStatus, instructions, statusCode);
  console.log(`Raw: "${rawStatus}", Instructions: "${instructions}", Code: "${statusCode}" => Normalized: "${normalized}"`);

  console.log("\n=== Checking AWB 41093210951871 in Database ===");
  const existingShipment = await db.query.shipments.findFirst({
    where: eq(shipments.waybill, "41093210951871"),
    with: { order: true },
  });

  if (!existingShipment) {
    console.log("Shipment with AWB 41093210951871 not found in local DB.");
  } else {
    console.log("Found Shipment in DB:");
    console.log(`Shipment ID: ${existingShipment.id}, Order ID: ${existingShipment.orderId}`);
    console.log(`Current Shipment Status: ${existingShipment.status}`);
    console.log(`Current Order Status: ${existingShipment.order?.status}`);
  }

  console.log("\n=== Executing syncActiveShipments() ===");
  const syncResult = await syncActiveShipments();
  console.log("Sync Result:", JSON.stringify(syncResult, null, 2));

  if (existingShipment) {
    const updatedShipment = await db.query.shipments.findFirst({
      where: eq(shipments.waybill, "41093210951871"),
      with: { order: true },
    });
    console.log("\n=== Post-Sync Shipment State in DB ===");
    console.log(`Updated Shipment Status: ${updatedShipment?.status}`);
    console.log(`Updated Order Status: ${updatedShipment?.order?.status}`);
  }
}

main().catch(console.error);
