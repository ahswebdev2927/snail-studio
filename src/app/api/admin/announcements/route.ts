import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { nanoid } from "nanoid";
import { z } from "zod";

const createAnnouncementSchema = z.object({
  text: z.string().min(1, "Text is required").max(200, "Text is too long"),
  icon: z.string().nullable().optional(),
  ctaText: z.string().max(50, "CTA text is too long").nullable().optional(),
  ctaLink: z.string().max(200, "CTA link is too long").nullable().optional(),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid text color hex code").default("#ffffff"),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid background color hex code").default("#A85328"),
  startDate: z.preprocess((val) => (val === "" ? null : val), z.string().transform((v) => new Date(v)).nullable().optional()),
  endDate: z.preprocess((val) => (val === "" ? null : val), z.string().transform((v) => new Date(v)).nullable().optional()),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  {
    message: "Start date must be before or equal to end date",
    path: ["endDate"],
  }
);

/**
 * GET /api/admin/announcements - Get all announcements (Admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const list = await db
      .select()
      .from(announcements)
      .orderBy(asc(announcements.sortOrder));

    return NextResponse.json(list, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/admin/announcements error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/announcements - Create a new announcement (Admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = createAnnouncementSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const newId = `ann_${nanoid(10)}`;
    const now = new Date();

    const newAnnouncement = await db.insert(announcements).values({
      id: newId,
      text: result.data.text,
      icon: result.data.icon || null,
      ctaText: result.data.ctaText || null,
      ctaLink: result.data.ctaLink || null,
      textColor: result.data.textColor,
      backgroundColor: result.data.backgroundColor,
      startDate: result.data.startDate || null,
      endDate: result.data.endDate || null,
      isActive: result.data.isActive,
      sortOrder: result.data.sortOrder,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json(newAnnouncement[0], { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/announcements error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
