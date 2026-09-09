import { db } from "@/db";
import { 
  refreshTokens, 
  tokenBlacklist, 
  securityOtps, 
  rateLimits, 
  inventoryReservations, 
  recentlyViewed, 
  searchLogs, 
  emailLogs, 
  notifications, 
  userAuditLogs, 
  adminAuditLogs 
} from "@/db/schema";
import { lt, or, and, isNotNull, desc, notInArray } from "drizzle-orm";

/**
 * Runs the weekly security cleanup routine.
 * Purges expired and revoked authentication/security records older than 7 days.
 */
export async function runWeeklySecurityCleanup() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  console.log(`[Security Cleanup] Running weekly security cleanup. Threshold date (7 days ago): ${sevenDaysAgo.toISOString()}`);

  // 1. refreshTokens: expiresAt < 7 days ago OR revokedAt < 7 days ago
  const deletedRefreshTokens = await db
    .delete(refreshTokens)
    .where(
      or(
        lt(refreshTokens.expiresAt, sevenDaysAgo),
        and(
          isNotNull(refreshTokens.revokedAt),
          lt(refreshTokens.revokedAt, sevenDaysAgo)
        )
      )
    )
    .returning();

  // 2. tokenBlacklist: expiresAt < 7 days ago
  const deletedBlacklist = await db
    .delete(tokenBlacklist)
    .where(lt(tokenBlacklist.expiresAt, sevenDaysAgo))
    .returning();

  // 3. securityOtps: expiresAt < 7 days ago
  const deletedOtps = await db
    .delete(securityOtps)
    .where(lt(securityOtps.expiresAt, sevenDaysAgo))
    .returning();

  // 4. rateLimits: resetAt < 7 days ago
  const deletedRateLimits = await db
    .delete(rateLimits)
    .where(lt(rateLimits.resetAt, sevenDaysAgo))
    .returning();

  const results = {
    refreshTokens: deletedRefreshTokens.length,
    tokenBlacklist: deletedBlacklist.length,
    securityOtps: deletedOtps.length,
    rateLimits: deletedRateLimits.length,
  };

  console.log("[Security Cleanup] Completed weekly security cleanup.", results);
  return results;
}

/**
 * Helper to delete records older than thresholdDate, while preserving at least the top N newest records.
 */
async function purgeTableWithRetentionBuffer(
  table: any,
  dateColumn: any,
  thresholdDate: Date,
  bufferSize: number = 50
): Promise<any[]> {
  const newestRows = await db
    .select({ id: table.id })
    .from(table)
    .orderBy(desc(dateColumn))
    .limit(bufferSize);

  const keepIds = newestRows.map((r: any) => r.id);

  if (keepIds.length === 0) {
    const deleted = await db.delete(table).where(lt(dateColumn, thresholdDate)).returning();
    return Array.isArray(deleted) ? deleted : [];
  }

  const deleted = await db
    .delete(table)
    .where(
      and(
        lt(dateColumn, thresholdDate),
        notInArray(table.id, keepIds)
      )
    )
    .returning();
  return Array.isArray(deleted) ? deleted : [];
}

/**
 * Runs the monthly operational cleanup routine.
 * Purges operational and historical logs older than the first day of the month two months prior,
 * while preserving the newest 50 records per log table as a safety/context buffer.
 */
export async function runMonthlyOperationalCleanup() {
  const now = new Date();
  // Calculate the first day of the month two months prior (e.g. if Aug 15, then June 1st)
  const firstDayTwoMonthsPrior = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  console.log(`[Operational Cleanup] Running monthly operational cleanup. Threshold date (first day of two months prior): ${firstDayTwoMonthsPrior.toISOString()} (preserving top 50 newest logs)`);

  // 1. inventoryReservations: createdAt < firstDayTwoMonthsPrior (keep top 50)
  const deletedInventoryReservations = await purgeTableWithRetentionBuffer(inventoryReservations, inventoryReservations.createdAt, firstDayTwoMonthsPrior, 50);

  // 2. recentlyViewed: createdAt < firstDayTwoMonthsPrior (keep top 50)
  const deletedRecentlyViewed = await purgeTableWithRetentionBuffer(recentlyViewed, recentlyViewed.createdAt, firstDayTwoMonthsPrior, 50);

  // 3. searchLogs: createdAt < firstDayTwoMonthsPrior (keep top 50)
  const deletedSearchLogs = await purgeTableWithRetentionBuffer(searchLogs, searchLogs.createdAt, firstDayTwoMonthsPrior, 50);

  // 4. emailLogs: sentAt < firstDayTwoMonthsPrior (keep top 50)
  const deletedEmailLogs = await purgeTableWithRetentionBuffer(emailLogs, emailLogs.sentAt, firstDayTwoMonthsPrior, 50);

  // 5. notifications: createdAt < firstDayTwoMonthsPrior (keep top 50)
  const deletedNotifications = await purgeTableWithRetentionBuffer(notifications, notifications.createdAt, firstDayTwoMonthsPrior, 50);

  // 6. userAuditLogs: createdAt < firstDayTwoMonthsPrior (keep top 50)
  const deletedUserAuditLogs = await purgeTableWithRetentionBuffer(userAuditLogs, userAuditLogs.createdAt, firstDayTwoMonthsPrior, 50);

  // 7. adminAuditLogs: timestamp < firstDayTwoMonthsPrior (keep top 50)
  const deletedAdminAuditLogs = await purgeTableWithRetentionBuffer(adminAuditLogs, adminAuditLogs.timestamp, firstDayTwoMonthsPrior, 50);

  const results = {
    inventoryReservations: deletedInventoryReservations.length,
    recentlyViewed: deletedRecentlyViewed.length,
    searchLogs: deletedSearchLogs.length,
    emailLogs: deletedEmailLogs.length,
    notifications: deletedNotifications.length,
    userAuditLogs: deletedUserAuditLogs.length,
    adminAuditLogs: deletedAdminAuditLogs.length,
  };

  console.log("[Operational Cleanup] Completed monthly operational cleanup.", results);
  return results;
}

/**
 * Convenience helper to run both cleanups sequentially (e.g. for manual CLI execution).
 */
export async function runAllCleanup() {
  console.log("[All Cleanup] Starting full database cleanup sweep...");
  const security = await runWeeklySecurityCleanup();
  const operational = await runMonthlyOperationalCleanup();
  return {
    security,
    operational,
  };
}
