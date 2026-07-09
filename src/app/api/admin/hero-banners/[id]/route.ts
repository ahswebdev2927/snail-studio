import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { heroBanners } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { z } from "zod";

const updateBannerSchema = z.object({
  imageUrl: z.string().url("Invalid image URL").optional(),
  title: z.string().min(1, "Title is required").max(100, "Title is too long").optional(),
  subtitle: z.string().max(200, "Subtitle is too long").optional().nullable(),
  ctaText: z.string().max(50, "CTA Text is too long").optional().nullable(),
  ctaLink: z.string().max(200, "CTA Link is too long").optional().nullable(),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
  contentAlignment: z.enum(['left', 'center', 'right']).optional(),
  lineSpacing: z.enum(['tight', 'normal', 'comfortable', 'loose']).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

/**
 * PUT /api/admin/hero-banners/[id] - Update a hero banner (Admin only)
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
    const banner = await db.query.heroBanners.findFirst({
      where: eq(heroBanners.id, id),
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
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const now = new Date();

    const updated = await db
      .update(heroBanners)
      .set({
        ...result.data,
        updatedAt: now,
      })
      .where(eq(heroBanners.id, id))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error: any) {
    console.error("PUT /api/admin/hero-banners/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/hero-banners/[id] - Delete a hero banner (Admin only)
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
    const banner = await db.query.heroBanners.findFirst({
      where: eq(heroBanners.id, id),
    });

    if (!banner) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }

    await db.delete(heroBanners).where(eq(heroBanners.id, id));

    return NextResponse.json({ success: true, message: "Banner deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE /api/admin/hero-banners/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
