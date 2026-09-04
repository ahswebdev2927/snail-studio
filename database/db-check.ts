import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Checking database connection and shipment_audit_logs table...");
  try {
    await db.run(sql`SELECT 1`);
    console.log("Database connection successful!");

    const shipmentsInfo = await db.run(sql`PRAGMA table_info(shipments)`);
    console.log("=== shipments Table Columns ===");
    console.table(shipmentsInfo.rows);

    const tableInfo = await db.run(sql`PRAGMA table_info(shipment_audit_logs)`);
    console.log("=== shipment_audit_logs Table Columns ===");
    console.table(tableInfo.rows);

    const indexList = await db.run(sql`PRAGMA index_list(shipment_audit_logs)`);
    console.log("=== shipment_audit_logs Indexes ===");
    console.table(indexList.rows);

    if (tableInfo.rows && tableInfo.rows.length > 0) {
      console.log("✅ VERIFICATION SUCCESS: shipment_audit_logs table is verified and active in the database!");
      process.exit(0);
    } else {
      console.error("❌ VERIFICATION FAILURE: shipment_audit_logs table missing from database.");
      process.exit(1);
    }
  } catch (error) {
    console.error("Database check failed:", error);
    process.exit(1);
  }
}

main();
