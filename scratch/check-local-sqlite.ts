import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("=== Inspecting local-dev.db SQLite File ===");
  const localClient = createClient({ url: "file:./database/local-dev.db" });
  const localDb = drizzle(localClient, { schema });

  const shipmentsInSqlite = await localDb.query.shipments.findMany({
    with: { order: true },
  });

  console.log(`Found ${shipmentsInSqlite.length} shipments in database/local-dev.db:`);
  for (const s of shipmentsInSqlite) {
    console.log(`- ID: ${s.id} | OrderID: ${s.orderId} | AWB/Waybill: ${s.waybill || s.trackingNumber} | Status in SQLite: ${s.status}`);
  }

  const targetOrder = await localDb.query.orders.findFirst({
    where: eq(schema.orders.id, "ord_2NyHoQ4um9"),
  });
  if (targetOrder) {
    console.log(`Found Order ord_2NyHoQ4um9 in local-dev.db: status=${targetOrder.status}`);
  } else {
    console.log(`Order ord_2NyHoQ4um9 NOT found in local-dev.db either.`);
  }
}

main().catch(console.error);
