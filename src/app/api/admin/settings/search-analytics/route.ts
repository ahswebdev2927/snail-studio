import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { searchLogs } from "@/db/schema/search";
import { desc, eq, sql } from "drizzle-orm";
import { authorize } from "@/middleware/auth";

/**
 * GET /api/admin/settings/search-analytics
 * Fetch search statistics and logs for admin dashboard
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    // 1. Fetch top popular queries
    const popular = await db
      .select({
        query: searchLogs.query,
        count: sql<number>`count(*)`.as("count"),
        avgResults: sql<number>`round(avg(${searchLogs.resultsCount}), 1)`.as("avgResults"),
      })
      .from(searchLogs)
      .groupBy(searchLogs.query)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // 2. Fetch recent queries
    const recent = await db
      .select({
        id: searchLogs.id,
        query: searchLogs.query,
        resultsCount: searchLogs.resultsCount,
        ipAddress: searchLogs.ipAddress,
        createdAt: searchLogs.createdAt,
      })
      .from(searchLogs)
      .orderBy(desc(searchLogs.createdAt))
      .limit(10);

    // 3. Fetch failed queries (0 results)
    const failed = await db
      .select({
        query: searchLogs.query,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(searchLogs)
      .where(eq(searchLogs.resultsCount, 0))
      .groupBy(searchLogs.query)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    return NextResponse.json({
      success: true,
      popular: popular.map((p) => ({
        query: p.query,
        count: Number(p.count),
        avgResults: Number(p.avgResults),
      })),
      recent: recent.map((r) => ({
        id: r.id,
        query: r.query,
        resultsCount: r.resultsCount,
        ipAddress: r.ipAddress,
        createdAt: new Date((r.createdAt as unknown as number) * 1000).toISOString(),
      })),
      failed: failed.map((f) => ({
        query: f.query,
        count: Number(f.count),
      })),
    });
  } catch (error: unknown) {
    console.error("GET /api/admin/settings/search-analytics error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}
