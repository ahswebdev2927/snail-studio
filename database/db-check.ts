import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Checking database connection...");
  try {
    // Perform a lightweight query to verify the connection
    await db.run(sql`SELECT 1`);
    console.log("Database connection successful!");
    process.exit(0);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

main();
