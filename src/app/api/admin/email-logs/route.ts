import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailLogs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { authorize } from "@/middleware/auth";

/**
 * GET /api/admin/email-logs - Retrieve email logs with pagination (Admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { searchParams } = new URL(req.url);
    const limitVal = parseInt(searchParams.get("limit") || "25", 10);
    const offsetVal = parseInt(searchParams.get("offset") || "0", 10);

    const limit = isNaN(limitVal) || limitVal < 1 ? 25 : limitVal;
    const offset = isNaN(offsetVal) || offsetVal < 0 ? 0 : offsetVal;

    // Fetch logs newest first
    const logs = await db
      .select()
      .from(emailLogs)
      .orderBy(desc(emailLogs.sentAt))
      .limit(limit)
      .offset(offset);

    // Count total records for frontend pagination state
    const allLogs = await db.select({ id: emailLogs.id }).from(emailLogs);
    const totalCount = allLogs.length;

    return NextResponse.json({
      logs,
      totalCount,
      limit,
      offset,
    }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/admin/email-logs error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
