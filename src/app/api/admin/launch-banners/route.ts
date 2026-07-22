import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { launchBanners } from "@/db/schema";
import { eq, asc, count } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { nanoid } from "nanoid";
import { z } from "zod";

const createBannerSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  subtitle: z.string().max(200, "Subtitle is too long").optional().nullable(),
  backgroundImage: z.string().optional().nullable(),
  productImage: z.string().optional().nullable(),
  textColor: z.string().default("#ffffff"),
  contentAlignment: z.enum(["left", "center", "right"]).default("center"),
  lineSpacing: z.enum(["tight", "normal", "comfortable", "loose"]).default("normal"),
  ctaBgColor: z.string().default("#8C5230"),
  ctaTextColor: z.string().default("#ffffff"),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

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
