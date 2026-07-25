import { runWeeklySecurityCleanup, runMonthlyOperationalCleanup, runAllCleanup } from "../src/services/db-cleanup/cleanup.service";

async function main() {
  const args = process.argv.slice(2);
  const isSecurity = args.includes("--security");
  const isOperational = args.includes("--operational");

  console.log("==========================================");
  console.log("     Snail Studio Database Cleanup CLI    ");
  console.log("==========================================");

  try {
    if (isSecurity && isOperational) {
      console.log("Running both Weekly Security and Monthly Operational cleanups...");
      const result = await runAllCleanup();
      console.log("\nCleanup Summary:");
      console.log("Security Cleanup:", result.security);
      console.log("Operational Cleanup:", result.operational);
    } else if (isSecurity) {
      console.log("Running Weekly Security cleanup...");
      const result = await runWeeklySecurityCleanup();
      console.log("\nCleanup Summary:");
      console.log("Security Cleanup:", result);
    } else if (isOperational) {
      console.log("Running Monthly Operational cleanup...");
      const result = await runMonthlyOperationalCleanup();
      console.log("\nCleanup Summary:");
      console.log("Operational Cleanup:", result);
    } else {
      // Default: run both
      console.log("Running all cleanup jobs (Default)...");
      const result = await runAllCleanup();
      console.log("\nCleanup Summary:");
      console.log("Security Cleanup:", result.security);
      console.log("Operational Cleanup:", result.operational);
    }
    console.log("==========================================");
    console.log("Database cleanup executed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Database cleanup failed with error:", error);
    process.exit(1);
  }
}

main();
