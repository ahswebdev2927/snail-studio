import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { z } from "zod";

const updateAnnouncementSchema = z.object({
  text: z.string().min(1, "Text is required").max(200, "Text is too long").optional(),
  icon: z.string().nullable().optional(),
  ctaText: z.string().max(50, "CTA text is too long").nullable().optional(),
  ctaLink: z.string().max(200, "CTA link is too long").nullable().optional(),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid text color hex code").optional(),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid background color hex code").optional(),
  startDate: z.preprocess((val) => (val === "" ? null : val), z.string().transform((v) => new Date(v)).nullable().optional()),
  endDate: z.preprocess((val) => (val === "" ? null : val), z.string().transform((v) => new Date(v)).nullable().optional()),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
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
 * PUT /api/admin/announcements/[id] - Update an announcement (Admin only)
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
    const announcement = await db.query.announcements.findFirst({
      where: eq(announcements.id, id),
    });

    if (!announcement) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    // Parse and validate body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = updateAnnouncementSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const now = new Date();

    const updated = await db
      .update(announcements)
      .set({
        ...result.data,
        updatedAt: now,
      })
      .where(eq(announcements.id, id))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error: any) {
    console.error("PUT /api/admin/announcements/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/announcements/[id] - Delete an announcement (Admin only)
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
    const announcement = await db.query.announcements.findFirst({
      where: eq(announcements.id, id),
    });

    if (!announcement) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    await db.delete(announcements).where(eq(announcements.id, id));

    return NextResponse.json({ success: true, message: "Announcement deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE /api/admin/announcements/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
