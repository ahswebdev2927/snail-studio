import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { heroBanners } from "@/db/schema";
import { eq, asc, count } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createHeroBannerSchema as createBannerSchema } from "@/lib/validators/marketing";

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
