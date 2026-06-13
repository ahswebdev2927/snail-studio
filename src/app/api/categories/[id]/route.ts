import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authorize } from "@/middleware/auth";
import { slugify } from "@/lib/utils";

const updateCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long").optional(),
  slug: z
    .string()
    .max(100, "Slug is too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional(),
  parentId: z.string().max(100).optional().nullable(),
  description: z.string().max(1000, "Description is too long").optional().nullable(),
  image: z.string().url("Invalid image URL").optional().nullable().or(z.literal("")),
});

// Helper function to check if setting parentId will create a circular loop
async function wouldCreateCircularReference(
  categoryId: string,
  proposedParentId: string
): Promise<boolean> {
  if (categoryId === proposedParentId) {
    return true;
  }

  let currentParentId: string | null = proposedParentId;
  while (currentParentId) {
    if (currentParentId === categoryId) {
      return true;
    }
    const parent: { parentId: string | null } | undefined = await db.query.categories.findFirst({
      where: eq(categories.id, currentParentId),
      columns: { parentId: true },
    });
    if (!parent) {
      break;
    }
    currentParentId = parent.parentId;
  }
  return false;
}

// GET /api/categories/[id] - get specific category
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const category = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error: unknown) {
    console.error("GET /api/categories/[id] error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 }
    );
  }
}

// PUT /api/categories/[id] - update category (Admin only)
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

    // 2. Find existing category
    const existingCategory = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    });

    if (!existingCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // 3. Parse and validate JSON body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = updateCategorySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, parentId, description, image } = result.data;
    let slug = result.data.slug;

    // 4. Handle slug changes
    if (slug === "") {
      slug = undefined;
    }

    if (name && !slug) {
      slug = slugify(name);
    }

    // 5. Check slug conflicts
    if (slug) {
      const conflicting = await db.query.categories.findFirst({
        where: (c, { and, eq, ne }) => and(eq(c.slug, slug!), ne(c.id, id)),
      });

      if (conflicting) {
        return NextResponse.json(
          { error: `Category with slug '${slug}' already exists` },
          { status: 400 }
        );
      }
    }

    // 6. Handle parentId changes & circular reference checks
    if (parentId !== undefined && parentId !== null) {
      // Check if parent category exists
      const parentExists = await db.query.categories.findFirst({
        where: eq(categories.id, parentId),
      });

      if (!parentExists) {
        return NextResponse.json(
          { error: `Parent category with ID '${parentId}' does not exist` },
          { status: 400 }
        );
      }

      // Check circular reference
      const isCircular = await wouldCreateCircularReference(id, parentId);
      if (isCircular) {
        return NextResponse.json(
          { error: "Circular reference detected: A category cannot be parented by itself or one of its descendants" },
          { status: 400 }
        );
      }
    }

    // 7. Update database record
    const updated = await db
      .update(categories)
      .set({
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image: image || null }),
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error: unknown) {
    console.error("PUT /api/categories/[id] error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - delete category (Admin only)
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

    // 2. Find category
    const existingCategory = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    });

    if (!existingCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // 3. Delete category (child subcategories will have parent_id set to null via foreign key action onDelete 'set null')
    await db.delete(categories).where(eq(categories.id, id));

    return NextResponse.json({ success: true, message: "Category deleted successfully" });
  } catch (error: unknown) {
    console.error("DELETE /api/categories/[id] error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 }
    );
  }
}
