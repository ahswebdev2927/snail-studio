import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { db } from "@/db";
import { media } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { deleteFromCloudinary } from "@/lib/cloudinary/uploader";

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

export async function DELETE(req: NextRequest) {
  try {
    // 1. Authorize Admin
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Media ID is required" }, { status: 400 });
    }

    // 3. Find the media item in the database
    const mediaItem = await db.query.media.findFirst({
      where: eq(media.id, id),
    });

    if (!mediaItem) {
      return NextResponse.json({ error: "Media item not found" }, { status: 404 });
    }

    // 4. Delete from Cloudinary
    try {
      await deleteFromCloudinary(mediaItem.publicId, mediaItem.resourceType as "image" | "video");
    } catch (err) {
      console.error(`Failed to delete Cloudinary asset ${mediaItem.publicId}:`, err);
    }

    // 5. Delete from database
    await db.delete(media).where(eq(media.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting media:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
