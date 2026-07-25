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
import { lt, or, and, isNotNull } from "drizzle-orm";

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
 * Runs the monthly operational cleanup routine.
 * Purges operational and historical logs older than the first day of the month two months prior.
 */
export async function runMonthlyOperationalCleanup() {
  const now = new Date();
  // Calculate the first day of the month two months prior (e.g. if Aug 15, then June 1st)
  const firstDayTwoMonthsPrior = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  console.log(`[Operational Cleanup] Running monthly operational cleanup. Threshold date (first day of two months prior): ${firstDayTwoMonthsPrior.toISOString()}`);

  // 1. inventoryReservations: createdAt < firstDayTwoMonthsPrior
  const deletedInventoryReservations = await db
    .delete(inventoryReservations)
    .where(lt(inventoryReservations.createdAt, firstDayTwoMonthsPrior))
    .returning();

  // 2. recentlyViewed: createdAt < firstDayTwoMonthsPrior
  const deletedRecentlyViewed = await db
    .delete(recentlyViewed)
    .where(lt(recentlyViewed.createdAt, firstDayTwoMonthsPrior))
    .returning();

  // 3. searchLogs: createdAt < firstDayTwoMonthsPrior
  const deletedSearchLogs = await db
    .delete(searchLogs)
    .where(lt(searchLogs.createdAt, firstDayTwoMonthsPrior))
    .returning();

  // 4. emailLogs: sentAt < firstDayTwoMonthsPrior
  const deletedEmailLogs = await db
    .delete(emailLogs)
    .where(lt(emailLogs.sentAt, firstDayTwoMonthsPrior))
    .returning();

  // 5. notifications: createdAt < firstDayTwoMonthsPrior
  const deletedNotifications = await db
    .delete(notifications)
    .where(lt(notifications.createdAt, firstDayTwoMonthsPrior))
    .returning();

  // 6. userAuditLogs: createdAt < firstDayTwoMonthsPrior
  const deletedUserAuditLogs = await db
    .delete(userAuditLogs)
    .where(lt(userAuditLogs.createdAt, firstDayTwoMonthsPrior))
    .returning();

  // 7. adminAuditLogs: timestamp < firstDayTwoMonthsPrior
  const deletedAdminAuditLogs = await db
    .delete(adminAuditLogs)
    .where(lt(adminAuditLogs.timestamp, firstDayTwoMonthsPrior))
    .returning();

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
