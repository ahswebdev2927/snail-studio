import { db } from "../src/db";
import { userAuditLogs } from "../src/db/schema";
import { eq, desc } from "drizzle-orm";

async function main() {
  const productId = process.argv[2];
  if (!productId) {
    console.log("\nUsage: npx tsx database/view-audit-logs.ts <product_id>\n");
    process.exit(1);
  }

  console.log(`\nFetching audit logs for entity ID: ${productId}...\n`);
  const logs = await db.query.userAuditLogs.findMany({
    where: eq(userAuditLogs.entityId, productId),
    orderBy: [desc(userAuditLogs.createdAt)],
  });

  if (logs.length === 0) {
    console.log("No audit logs found for this product.\n");
    process.exit(0);
  }

  logs.forEach((log) => {
    console.log("==================================================");
    console.log(`Log ID:    ${log.id}`);
    console.log(`Action:    ${log.action}`);
    console.log(`User ID:   ${log.userId || "System/Unknown"}`);
    console.log(`IP:        ${log.ipAddress}`);
    console.log(`Date:      ${log.createdAt}`);
    console.log("--------------------------------------------------");
    console.log("Changes:");
    try {
      const parsedChanges = JSON.parse(log.changes || "{}");
      console.log(JSON.stringify(parsedChanges, null, 2));
    } catch {
      console.log(log.changes);
    }
    console.log("==================================================\n");
  });
  
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
