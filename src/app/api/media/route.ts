import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { db } from "@/db";
import { media } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    // 1. Authorize Admin
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);
    const resourceType = searchParams.get("resourceType");
    const folder = searchParams.get("folder");

    // 3. Build query filters
    const conditions = [];
    if (resourceType === "image" || resourceType === "video") {
      conditions.push(eq(media.resourceType, resourceType));
    }
    if (folder) {
      conditions.push(eq(media.folder, folder));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 4. Fetch from database
    const mediaItems = await db.query.media.findMany({
      where: whereClause,
      orderBy: [desc(media.createdAt)],
      limit,
      offset,
    });

    return NextResponse.json(mediaItems);
  } catch (error) {
    console.error("Error fetching media list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
