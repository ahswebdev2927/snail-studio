import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sizeProfiles } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { z } from "zod";

const updateSizeProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(20, "Name is too long").optional(),
  description: z.string().max(200, "Description is too long").optional(),
  thumb: z.number().int().min(5, "Thumb width must be at least 5mm").max(25, "Thumb width cannot exceed 25mm").optional(),
  index: z.number().int().min(5, "Index width must be at least 5mm").max(25, "Index width cannot exceed 25mm").optional(),
  middle: z.number().int().min(5, "Middle width must be at least 5mm").max(25, "Middle width cannot exceed 25mm").optional(),
  ring: z.number().int().min(5, "Ring width must be at least 5mm").max(25, "Ring width cannot exceed 25mm").optional(),
  pinky: z.number().int().min(5, "Pinky width must be at least 5mm").max(25, "Pinky width cannot exceed 25mm").optional(),
  isActive: z.boolean().optional(),
});

/**
 * PUT /api/admin/size-profiles/[id] - Update a size profile (Admin only)
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
    const profile = await db.query.sizeProfiles.findFirst({
      where: eq(sizeProfiles.id, id),
    });

    if (!profile) {
      return NextResponse.json({ error: "Size profile not found" }, { status: 404 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = updateSizeProfileSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check duplicate name if name is changing
    if (result.data.name && result.data.name !== profile.name) {
      const existing = await db.query.sizeProfiles.findFirst({
        where: and(
          eq(sizeProfiles.name, result.data.name),
          ne(sizeProfiles.id, id)
        ),
      });

      if (existing) {
        return NextResponse.json(
          { error: "Duplicate name", details: { name: ["A size profile with this name already exists."] } },
          { status: 400 }
        );
      }
    }

    const now = new Date();

    const updated = await db
      .update(sizeProfiles)
      .set({
        ...result.data,
        updatedAt: now,
      })
      .where(eq(sizeProfiles.id, id))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error: any) {
    console.error("PUT /api/admin/size-profiles/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/size-profiles/[id] - Delete a size profile (Admin only)
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
    const profile = await db.query.sizeProfiles.findFirst({
      where: eq(sizeProfiles.id, id),
    });

    if (!profile) {
      return NextResponse.json({ error: "Size profile not found" }, { status: 404 });
    }

    await db.delete(sizeProfiles).where(eq(sizeProfiles.id, id));

    return NextResponse.json({ success: true, message: "Size profile deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE /api/admin/size-profiles/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
