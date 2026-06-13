import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { authorize } from "@/middleware/auth";
import { slugify } from "@/lib/utils";

const createBrandSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  slug: z
    .string()
    .max(100, "Slug is too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional()
    .or(z.literal("")),
  description: z.string().max(1000, "Description is too long").optional().nullable(),
  logoUrl: z.string().url("Invalid logo URL").optional().nullable().or(z.literal("")),
});

// GET /api/brands - list all brands sorted by name ascending
export async function GET() {
  try {
    const allBrands = await db.query.brands.findMany({
      orderBy: (b, { asc }) => [asc(b.name)],
    });
    return NextResponse.json(allBrands);
  } catch (error: unknown) {
    console.error("GET /api/brands error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 }
    );
  }
}

// POST /api/brands - create a brand (Admin only)
export async function POST(req: NextRequest) {
  try {
    // 1. Authorize Admin role
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    // 2. Parse and validate JSON body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = createBrandSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, description, logoUrl } = result.data;
    let slug = result.data.slug;

    // 3. Generate slug if not provided
    if (!slug) {
      slug = slugify(name);
    }

    if (!slug) {
      return NextResponse.json(
        { error: "Could not generate a valid slug from name" },
        { status: 400 }
      );
    }

    // 4. Check if slug already exists
    const existing = await db.query.brands.findFirst({
      where: eq(brands.slug, slug),
    });

    if (existing) {
      return NextResponse.json(
        { error: `Brand with slug '${slug}' already exists` },
        { status: 400 }
      );
    }

    // 5. Insert brand
    const now = new Date();
    const newBrandId = `brd_${nanoid(10)}`;
    const inserted = await db
      .insert(brands)
      .values({
        id: newBrandId,
        name,
        slug,
        description: description || null,
        logoUrl: logoUrl || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/brands error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 }
    );
  }
}
