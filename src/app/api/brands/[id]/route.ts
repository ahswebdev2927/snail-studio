import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authorize } from "@/middleware/auth";
import { slugify } from "@/lib/utils";

const updateBrandSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long").optional(),
  slug: z
    .string()
    .max(100, "Slug is too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional(),
  description: z.string().max(1000, "Description is too long").optional().nullable(),
  logoUrl: z.string().url("Invalid logo URL").optional().nullable().or(z.literal("")),
});

// GET /api/brands/[id] - get specific brand details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const brand = await db.query.brands.findFirst({
      where: eq(brands.id, id),
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    return NextResponse.json(brand);
  } catch (error: unknown) {
    console.error("GET /api/brands/[id] error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 }
    );
  }
}

// PUT /api/brands/[id] - update a brand (Admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Authorize Admin
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    // 2. Find existing brand
    const existingBrand = await db.query.brands.findFirst({
      where: eq(brands.id, id),
    });

    if (!existingBrand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // 3. Parse and validate JSON body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = updateBrandSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, description, logoUrl } = result.data;
    let slug = result.data.slug;

    // 4. Handle slug changes
    if (slug === "") {
      slug = undefined; // Trigger auto-generation if explicitly cleared
    }

    if (name && !slug) {
      // If name is updated but slug is not explicitly provided, generate a new slug
      slug = slugify(name);
    }

    // 5. Check if slug conflicts with other brands
    if (slug) {
      const conflicting = await db.query.brands.findFirst({
        where: (b, { and, eq, ne }) => and(eq(b.slug, slug!), ne(b.id, id)),
      });

      if (conflicting) {
        return NextResponse.json(
          { error: `Brand with slug '${slug}' already exists` },
          { status: 400 }
        );
      }
    }

    // 6. Update database record
    const updated = await db
      .update(brands)
      .set({
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
        updatedAt: new Date(),
      })
      .where(eq(brands.id, id))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error: unknown) {
    console.error("PUT /api/brands/[id] error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 }
    );
  }
}

// DELETE /api/brands/[id] - delete a brand (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Authorize Admin
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    // 2. Find brand to delete
    const existingBrand = await db.query.brands.findFirst({
      where: eq(brands.id, id),
    });

    if (!existingBrand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // 3. Delete brand
    await db.delete(brands).where(eq(brands.id, id));

    return NextResponse.json({ success: true, message: "Brand deleted successfully" });
  } catch (error: unknown) {
    console.error("DELETE /api/brands/[id] error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 }
    );
  }
}
