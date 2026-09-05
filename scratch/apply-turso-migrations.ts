import fs from "node:fs";

// Load .env variables into process.env BEFORE initializing client
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

import { createClient } from "@libsql/client";

async function applyTursoMigrations() {
  console.log("Connecting directly to Turso database...");
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL is missing from .env");
  }

  const client = createClient({ url, authToken });

  const statements = [
    "ALTER TABLE `shipments` ADD `label_url` text;",
  ];

  for (const stmt of statements) {
    try {
      console.log(`Executing on Turso: ${stmt}`);
      await client.execute(stmt);
      console.log("✓ Statement executed successfully.");
    } catch (err: any) {
      if (err?.message?.includes("duplicate column name") || err?.cause?.message?.includes("duplicate column name")) {
        console.log("✓ Column already exists on Turso database.");
      } else {
        console.error("Statement execution error:", err.message);
      }
    }
  }

  // Verify column existence in shipments table
  try {
    const info = await client.execute("PRAGMA table_info(shipments);");
    const columns = info.rows.map((r: any) => r.name);
    console.log("Turso shipments columns:", columns);
    if (columns.includes("label_url")) {
      console.log("🎉 SUCCESS: 'label_url' column is verified on Turso database!");
    } else {
      console.error("❌ WARNING: 'label_url' column not found in Turso shipments table!");
    }
  } catch (err: any) {
    console.error("Failed to inspect shipments table info on Turso:", err.message);
  }

  process.exit(0);
}

applyTursoMigrations().catch((err) => {
  console.error("Turso migration script error:", err);
  process.exit(1);
});
