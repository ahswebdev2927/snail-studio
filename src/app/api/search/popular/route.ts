import { NextResponse } from "next/server";
import { getPopularSearches } from "@/services/search/search-analytics.service";

const DEFAULT_POPULAR_TAGS = [
  "emerald coffin",
  "blush pink marble",
  "gold french tips",
  "velvet cat eye",
  "matte summer",
  "short almond set",
];

function toTitleCase(str: string): string {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * GET /api/search/popular
 * Returns the most popular/trending search queries.
 */
export async function GET() {
  try {
    const popularData = await getPopularSearches(10);
    const dbQueries = popularData.map((item) => item.query);

    // Merge database queries with defaults to guarantee 6 solid tags
    const combinedQueries = Array.from(new Set([...dbQueries, ...DEFAULT_POPULAR_TAGS]));
    const selectedQueries = combinedQueries.slice(0, 6).map(toTitleCase);

    return NextResponse.json({
      success: true,
      queries: selectedQueries,
    });
  } catch (error: unknown) {
    console.error("Failed to fetch popular searches:", error);
    // Silent fallback to default tags on error
    const fallbackQueries = DEFAULT_POPULAR_TAGS.map(toTitleCase);
    return NextResponse.json({
      success: true,
      queries: fallbackQueries,
    });
  }
}
