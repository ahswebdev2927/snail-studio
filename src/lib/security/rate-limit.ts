import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Milliseconds remaining until reset
}

/**
 * Checks the request count for a given key against a rate limit.
 * Persists and updates rate limit state in the SQLite/LibSQL database.
 * 
 * @param key Unique key for identifying the client and action (e.g. "ip:auth/login")
 * @param limit Maximum allowed requests within the window
 * @param windowMs Time window in milliseconds (e.g. 60000 for 1 minute)
 */
export async function checkRateLimitSql(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = new Date();
  const nowMs = now.getTime();

  try {
    // 1. Fetch current rate limit record
    const record = await db.query.rateLimits.findFirst({
      where: eq(rateLimits.key, key),
    });

    // 2. Case A: No record exists yet
    if (!record) {
      const resetAt = new Date(nowMs + windowMs);
      await db.insert(rateLimits).values({
        key,
        count: 1,
        resetAt,
        createdAt: now,
        updatedAt: now,
      });

      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: windowMs,
      };
    }

    const resetAtMs = record.resetAt.getTime();

    // 3. Case B: The reset window has passed
    if (nowMs > resetAtMs) {
      const newResetAt = new Date(nowMs + windowMs);
      await db
        .update(rateLimits)
        .set({
          count: 1,
          resetAt: newResetAt,
          updatedAt: now,
        })
        .where(eq(rateLimits.key, key));

      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: windowMs,
      };
    }

    // 4. Case C: Within the reset window, limit exceeded
    if (record.count >= limit) {
      // Still increment count so we know how much they exceeded it,
      // but return success: false.
      await db
        .update(rateLimits)
        .set({
          count: record.count + 1,
          updatedAt: now,
        })
        .where(eq(rateLimits.key, key));

      return {
        success: false,
        limit,
        remaining: 0,
        reset: Math.max(0, resetAtMs - nowMs),
      };
    }

    // 5. Case D: Within the reset window, limit not yet exceeded
    const newCount = record.count + 1;
    await db
      .update(rateLimits)
      .set({
        count: newCount,
        updatedAt: now,
      })
      .where(eq(rateLimits.key, key));

    return {
      success: true,
      limit,
      remaining: limit - newCount,
      reset: Math.max(0, resetAtMs - nowMs),
    };
  } catch (error) {
    console.error("Rate limiter database error:", error);
    // Fail open in case of database errors to avoid locking out legitimate users,
    // but log the failure details.
    return {
      success: true,
      limit,
      remaining: 1,
      reset: windowMs,
    };
  }
}

/**
 * Convenience helper to rate limit requests based on client IP.
 * Compose the key using IP and route identifier.
 */
export async function rateLimitRequest(
  req: NextRequest,
  routeIdentifier: string,
  limit: number = 30,
  windowMs: number = 60 * 1000
): Promise<RateLimitResult> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";
  
  const key = `${ip}:${routeIdentifier}`;
  return checkRateLimitSql(key, limit, windowMs);
}
