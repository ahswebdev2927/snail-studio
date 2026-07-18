import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { launchBanners } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { z } from "zod";

const updateBannerSchema = z.object({
  productId: z.string().min(1, "Product ID is required").optional(),
  title: z.string().min(1, "Title is required").max(100, "Title is too long").optional(),
  subtitle: z.string().max(200, "Subtitle is too long").optional().nullable(),
  backgroundImage: z.string().optional().nullable(),
  productImage: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

/**
 * PUT /api/admin/launch-banners/[id] - Update a launch banner (Admin only)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id } = await params;

    // Check existence
    const banner = await db.query.launchBanners.findFirst({
      where: eq(launchBanners.id, id),
    });

    if (!banner) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }

    // Parse and validate body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = updateBannerSchema.safeParse(body);
    if (!result.success) {
      console.error("PUT /api/admin/launch-banners/[id] validation failed:", result.error.flatten());
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const now = new Date();

    const updated = await db
      .update(launchBanners)
      .set({
        ...result.data,
        updatedAt: now,
      })
      .where(eq(launchBanners.id, id))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error: any) {
    console.error("PUT /api/admin/launch-banners/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/launch-banners/[id] - Delete a launch banner (Admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id } = await params;

    // Check existence
    const banner = await db.query.launchBanners.findFirst({
      where: eq(launchBanners.id, id),
    });

    if (!banner) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }

    await db.delete(launchBanners).where(eq(launchBanners.id, id));

    return NextResponse.json({ success: true, message: "Banner deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE /api/admin/launch-banners/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
