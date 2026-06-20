import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sizeProfiles } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { nanoid } from "nanoid";
import { z } from "zod";

const createSizeProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(20, "Name is too long"),
  description: z.string().max(200, "Description is too long").default(""),
  thumb: z.number().int().min(5, "Thumb width must be at least 5mm").max(25, "Thumb width cannot exceed 25mm"),
  index: z.number().int().min(5, "Index width must be at least 5mm").max(25, "Index width cannot exceed 25mm"),
  middle: z.number().int().min(5, "Middle width must be at least 5mm").max(25, "Middle width cannot exceed 25mm"),
  ring: z.number().int().min(5, "Ring width must be at least 5mm").max(25, "Ring width cannot exceed 25mm"),
  pinky: z.number().int().min(5, "Pinky width must be at least 5mm").max(25, "Pinky width cannot exceed 25mm"),
  isActive: z.boolean().default(true),
});

/**
 * GET /api/admin/size-profiles - Get all size profiles sorted by Thumb width (ascending)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const profiles = await db
      .select()
      .from(sizeProfiles)
      .orderBy(asc(sizeProfiles.thumb));

    return NextResponse.json(profiles, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/admin/size-profiles error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/size-profiles - Create a new size profile (Admin only)
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

    const result = createSizeProfileSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check duplicate name
    const existing = await db.query.sizeProfiles.findFirst({
      where: eq(sizeProfiles.name, result.data.name),
    });

    if (existing) {
      return NextResponse.json(
        { error: "Duplicate name", details: { name: ["A size profile with this name already exists."] } },
        { status: 400 }
      );
    }

    const newId = `sz_${nanoid(10)}`;
    const now = new Date();

    const newProfile = await db.insert(sizeProfiles).values({
      id: newId,
      name: result.data.name,
      description: result.data.description,
      thumb: result.data.thumb,
      index: result.data.index,
      middle: result.data.middle,
      ring: result.data.ring,
      pinky: result.data.pinky,
      isActive: result.data.isActive,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json(newProfile[0], { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/size-profiles error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
