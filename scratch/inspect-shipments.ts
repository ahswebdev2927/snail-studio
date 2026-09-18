import { db } from "@/db";
import { shipments } from "@/db/schema";
import { getShippingProvider } from "@/lib/shipping";

async function main() {
  console.log("=== Inspecting All Shipments in Database ===");
  const allShipments = await db.query.shipments.findMany({
    with: { order: true },
  });

  console.log(`Found ${allShipments.length} total shipments in database:`);
  for (const s of allShipments) {
    console.log(`- ID: ${s.id} | OrderID: ${s.orderId} | AWB/Waybill: ${s.waybill || s.trackingNumber} | Status in DB: ${s.status} | Provider: ${s.provider}`);
    const waybill = s.waybill || s.trackingNumber;
    if (waybill && s.provider === "delhivery") {
      try {
        const provider = getShippingProvider("delhivery");
        const trackRes = await provider.trackShipment(waybill);
        console.log(`  -> Delhivery API trackShipment("${waybill}") normalizedStatus: "${trackRes.normalizedStatus}", rawStatus: "${trackRes.currentStatus}"`);
      } catch (err: any) {
        console.log(`  -> Error tracking AWB ${waybill}: ${err.message}`);
      }
    }
  }
}

main().catch(console.error);
