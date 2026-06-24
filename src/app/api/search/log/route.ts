import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { logSearchQuery } from "@/services/search/search-analytics.service";

/**
 * POST /api/search/log
 * Logs a search query to the database for analytics.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { query?: unknown; resultsCount?: unknown };
    const { query, resultsCount } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required and must be a string" },
        { status: 400 }
      );
    }

    const count = typeof resultsCount === "number" ? resultsCount : 0;

    // Resolve current user if logged in
    const accessToken = request.cookies.get("accessToken")?.value;
    let userId: string | undefined;
    if (accessToken) {
      const user = await getSessionUser(accessToken);
      if (user) {
        userId = user.id;
      }
    }

    // Get client IP address
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      undefined;

    // Log the query in the background
    await logSearchQuery(query, count, userId, ipAddress);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Failed to log search query:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}
