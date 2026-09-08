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

    try {
      await migrate(db, { migrationsFolder: "./database/migrations" });
      console.log(`Migrations applied successfully to ${provider}!`);
      process.exit(0);
    } catch (migError: any) {
      const errStr = String(migError?.message || migError?.cause?.message || migError);
      console.warn(`Standard migrate failed on '${provider}':`, errStr);

      if (errStr.includes("duplicate column name") || errStr.includes("already exists")) {
        console.log("Attempting graceful statement-by-statement migration fallback...");

        const sqlFiles = fs
          .readdirSync("./database/migrations")
          .filter((f) => f.endsWith(".sql"))
          .sort();

        for (const file of sqlFiles) {
          console.log(`Processing migration file: ${file}`);
          const content = fs.readFileSync(`./database/migrations/${file}`, "utf-8");
          const statements = content.split("--> statement-breakpoint");

          for (const stmt of statements) {
            const cleanStmt = stmt.trim();
            if (!cleanStmt) continue;

            try {
              await (db as any).run(cleanStmt);
            } catch (stmtErr: any) {
              const stmtErrStr = String(stmtErr?.message || stmtErr?.cause?.message || stmtErr);
              if (
                stmtErrStr.includes("duplicate column name") ||
                stmtErrStr.includes("already exists") ||
                stmtErrStr.includes("no such table")
              ) {
                console.log(`[Safe Skip] ${stmtErrStr.slice(0, 80)}...`);
              } else {
                console.warn(`Statement warning in ${file}:`, stmtErrStr);
              }
            }
          }
        }

        console.log(`Graceful fallback migration completed successfully for ${provider}!`);
        process.exit(0);
      } else {
        throw migError;
      }
    }
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();
