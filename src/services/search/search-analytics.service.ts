import { db } from "@/db";
import { searchLogs } from "@/db/schema/search";
import { desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Log a search query into the search_logs table.
 * Queries are normalized to lowercase to prevent duplicate stats (e.g., "Coffin" vs "coffin").
 */
export async function logSearchQuery(
  query: string,
  resultsCount: number,
  userId?: string,
  ipAddress?: string
): Promise<void> {
  const normalizedQuery = query.trim().toLowerCase();
  
  if (!normalizedQuery) {
    return;
  }

  try {
    await db.insert(searchLogs).values({
      id: `srch_${nanoid(12)}`,
      query: normalizedQuery,
      resultsCount: resultsCount || 0,
      userId: userId || null,
      ipAddress: ipAddress || null,
    });
  } catch (error) {
    console.error("Error logging search query:", error);
  }
}

/**
 * Retrieve the most popular search terms from the search logs.
 * Groups by query, counts frequency, and orders descending.
 */
export async function getPopularSearches(limit: number = 6): Promise<{ query: string; count: number }[]> {
  try {
    const popular = await db
      .select({
        query: searchLogs.query,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(searchLogs)
      .groupBy(searchLogs.query)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return popular.map((item) => ({
      query: item.query,
      count: Number(item.count),
    }));
  } catch (error) {
    console.error("Error retrieving popular searches:", error);
    return [];
  }
}
