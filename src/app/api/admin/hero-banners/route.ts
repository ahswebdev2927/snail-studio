import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { heroBanners } from "@/db/schema";
import { eq, asc, count } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { nanoid } from "nanoid";
import { z } from "zod";

const createBannerSchema = z.object({
  imageUrl: z.string().min(1, "Image URL is required").refine(
    (val) => val.startsWith("/") || /^(https?:\/\/)/.test(val),
    "Must be a relative path starting with '/' or an absolute HTTP(S) URL"
  ),
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  subtitle: z.string().max(200, "Subtitle is too long").optional().nullable(),
  ctaText: z.string().max(50, "CTA Text is too long").optional().nullable(),
  ctaLink: z.string().max(200, "CTA Link is too long").optional().nullable(),
  textColor: z.string().optional().nullable().transform((val) => {
    if (!val || val.trim() === "") return "#ffffff";
    return val;
  }).refine(
    (val) => /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val),
    "Invalid hex color"
  ),
  contentAlignment: z.enum(['left', 'center', 'right']).default('center'),
  lineSpacing: z.enum(['tight', 'normal', 'comfortable', 'loose']).default('normal'),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

/**
 * GET /api/admin/hero-banners - Get all hero banners (Admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const banners = await db
      .select()
      .from(heroBanners)
      .orderBy(asc(heroBanners.sortOrder));

    return NextResponse.json(banners, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/admin/hero-banners error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/hero-banners - Create a new hero banner (Admin only, Max 5)
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    // Parse and validate body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = createBannerSchema.safeParse(body);
    if (!result.success) {
      console.error("POST /api/admin/hero-banners validation failed:", result.error.flatten());
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check count limit (Max 5)
    const existingCountResult = await db
      .select({ val: count() })
      .from(heroBanners);
    
    const totalCount = existingCountResult[0]?.val || 0;
    if (totalCount >= 5) {
      return NextResponse.json(
        { error: "Limit reached", details: "Maximum of 5 banners are allowed." },
        { status: 400 }
      );
    }

    const newId = `ban_${nanoid(10)}`;
    const now = new Date();

    const newBanner = await db.insert(heroBanners).values({
      id: newId,
      imageUrl: result.data.imageUrl,
      title: result.data.title,
      subtitle: result.data.subtitle || null,
      ctaText: result.data.ctaText || null,
      ctaLink: result.data.ctaLink || null,
      textColor: result.data.textColor,
      contentAlignment: result.data.contentAlignment,
      lineSpacing: result.data.lineSpacing,
      sortOrder: result.data.sortOrder,
      isActive: result.data.isActive,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json(newBanner[0], { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/hero-banners error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
