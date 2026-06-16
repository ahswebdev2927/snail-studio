import { db } from "../src/db";
import { migrate } from "drizzle-orm/libsql/migrator";

async function main() {
  console.log("Running database migrations...");
  try {
    await migrate(db, { migrationsFolder: "./database/migrations" });
    console.log("Migrations applied successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();
