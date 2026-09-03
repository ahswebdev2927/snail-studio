import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
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

loadEnv();

async function fixTursoRemoteSchema() {
  console.log("=== Inspecting & Applying ALTER TABLE to Turso Remote DB ===");
  const tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const tursoInfo = await tursoClient.execute("PRAGMA table_info(payments)");
  console.log("Turso initial columns:", tursoInfo.rows.map(r => r.name));

  if (!tursoInfo.rows.some(r => r.name === "purpose")) {
    console.log("Adding purpose column to Turso remote database table payments...");
    await tursoClient.execute("ALTER TABLE `payments` ADD `purpose` text DEFAULT 'checkout' NOT NULL");
    console.log("ALTER TABLE executed successfully on Turso!");

    const verifyInfo = await tursoClient.execute("PRAGMA table_info(payments)");
    console.log("Turso updated columns:", verifyInfo.rows.map(r => r.name));
  } else {
    console.log("Turso database already has purpose column!");
  }

  process.exit(0);
}

fixTursoRemoteSchema();
