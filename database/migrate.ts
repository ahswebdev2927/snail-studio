import fs from "node:fs";
import { migrate } from "drizzle-orm/libsql/migrator";

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

async function main() {
  const provider = process.env.DB_PROVIDER || "sqlite";
  console.log(`Running database migrations for provider '${provider}'...`);
  try {
    const { db } = await import("../src/db");
    await migrate(db, { migrationsFolder: "./database/migrations" });
    console.log(`Migrations applied successfully to ${provider}!`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();
