import fs from "node:fs";

// Load .env variables into process.env BEFORE initializing database client
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
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { sql } from "drizzle-orm";

async function main() {
  const { db } = await import("@/db");
  const provider = process.env.DB_PROVIDER || "sqlite";
  console.log(`Checking DB schema for provider '${provider}'...`);

  try {
    // 1. Check if return_requests table exists
    const tableCheck: any = await db.run(
      sql`SELECT name FROM sqlite_master WHERE type='table' AND name='return_requests';`
    );

    console.log("Table Existence:", tableCheck.rows);

    // 2. Fetch table column info
    const pragmaInfo: any = await db.run(sql`PRAGMA table_info('return_requests');`);

    console.log("\n--- Columns in 'return_requests' table ---");
    console.table(
      pragmaInfo.rows.map((row: any) => ({
        cid: row.cid,
        name: row.name,
        type: row.type,
        notnull: row.notnull,
        dflt_value: row.dflt_value,
      }))
    );

    // 3. Fetch indexes on return_requests
    const indexInfo: any = await db.run(sql`PRAGMA index_list('return_requests');`);
    console.log("\n--- Indexes on 'return_requests' table ---");
    console.table(indexInfo.rows);

    process.exit(0);
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  }
}

main();
