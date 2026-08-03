import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { launchBanners } from "@/db/schema";
import { eq, asc, count } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createLaunchBannerSchema as createBannerSchema } from "@/lib/validators/marketing";

/**
 * GET /api/admin/launch-banners - Get all launch banners (Admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const banners = await db
      .select()
      .from(launchBanners)
      .orderBy(asc(launchBanners.sortOrder));

    return NextResponse.json(banners, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/admin/launch-banners error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/launch-banners - Create a new launch banner (Admin only)
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
      console.error("POST /api/admin/launch-banners validation failed:", result.error.flatten());
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const newId = `lban_${nanoid(10)}`;
    const now = new Date();

    const newBanner = await db.insert(launchBanners).values({
      id: newId,
      productId: result.data.productId,
      title: result.data.title,
      subtitle: result.data.subtitle || null,
      backgroundImage: result.data.backgroundImage || null,
      productImage: result.data.productImage || null,
      textColor: result.data.textColor,
      contentAlignment: result.data.contentAlignment,
      lineSpacing: result.data.lineSpacing,
      ctaBgColor: result.data.ctaBgColor,
      ctaTextColor: result.data.ctaTextColor,
      sortOrder: result.data.sortOrder,
      isActive: result.data.isActive,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json(newBanner[0], { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/launch-banners error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
