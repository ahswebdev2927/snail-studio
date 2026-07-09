import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { collections, collectionRules, productCollections } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { authorize } from "@/middleware/auth";
import { slugify } from "@/lib/utils";
import { compileDynamicCollection } from "@/services/collections/collections.service";

const updateCollectionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long").optional(),
  slug: z
    .string()
    .max(100, "Slug is too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional(),
  description: z.string().max(1000, "Description is too long").optional().nullable(),
  type: z.enum(["manual", "dynamic"]).optional(),
  isActive: z.boolean().optional(),
  showOnHomepage: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  productIds: z.array(z.string()).optional(), // for manual type
  rules: z
    .array(
      z.object({
        column: z.string(),
        relation: z.string(),
        value: z.string(),
      })
    )
    .optional(), // for dynamic type
});

// GET /api/admin/collections/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const collection = await db.query.collections.findFirst({
      where: eq(collections.id, id),
      with: {
        rules: true,
        products: true,
      },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    return NextResponse.json(collection);
  } catch (error: unknown) {
    console.error("GET /api/admin/collections/[id] error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 }
    );
  }
}

// PUT /api/admin/collections/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const existingCollection = await db.query.collections.findFirst({
      where: eq(collections.id, id),
    });

    if (!existingCollection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = updateCollectionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      type,
      isActive,
      showOnHomepage,
      sortOrder,
      productIds = [],
      rules = [],
    } = result.data;

    let slug = result.data.slug;
    if (slug === "") slug = undefined;
    if (name && !slug) {
      slug = slugify(name);
    }

    // Check slug conflicts
    if (slug) {
      const conflicting = await db.query.collections.findFirst({
        where: and(eq(collections.slug, slug), ne(collections.id, id)),
      });
      if (conflicting) {
        return NextResponse.json(
          { error: `Collection with slug '${slug}' already exists` },
          { status: 400 }
        );
      }
    }

    const targetType = type || existingCollection.type;

    await db.transaction(async (tx) => {
      // 1. Update collection metadata
      await tx
        .update(collections)
        .set({
          ...(name !== undefined && { name }),
          ...(slug !== undefined && { slug }),
          ...(description !== undefined && { description }),
          ...(type !== undefined && { type }),
          ...(isActive !== undefined && { isActive }),
          ...(showOnHomepage !== undefined && { showOnHomepage }),
          ...(sortOrder !== undefined && { sortOrder }),
          updatedAt: new Date(),
        })
        .where(eq(collections.id, id));

      // 2. Re-bind products or rules
      if (targetType === "manual") {
        // Delete all old rules (if switching type or just clean update)
        await tx.delete(collectionRules).where(eq(collectionRules.collectionId, id));

        if (result.data.productIds !== undefined) {
          // Delete old products
          await tx.delete(productCollections).where(eq(productCollections.collectionId, id));
          
          if (productIds.length > 0) {
            const valuesToInsert = productIds.map((pId) => ({
              productId: pId,
              collectionId: id,
            }));
            await tx.insert(productCollections).values(valuesToInsert);
          }
        }
      } else if (targetType === "dynamic") {
        // Delete all old product associations
        await tx.delete(productCollections).where(eq(productCollections.collectionId, id));

        if (result.data.rules !== undefined) {
          // Delete old rules
          await tx.delete(collectionRules).where(eq(collectionRules.collectionId, id));

          if (rules.length > 0) {
            const valuesToInsert = rules.map((r) => ({
              id: `rule_${nanoid(10)}`,
              collectionId: id,
              column: r.column,
              relation: r.relation,
              value: r.value,
            }));
            await tx.insert(collectionRules).values(valuesToInsert);
          }
        }
      }
    });

    // 3. Compile dynamic collection immediately if final type is dynamic
    if (targetType === "dynamic") {
      await compileDynamicCollection(id);
    }

    // Fetch and return the updated collection
    const updated = await db.query.collections.findFirst({
      where: eq(collections.id, id),
      with: {
        rules: true,
        products: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("PUT /api/admin/collections/[id] error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/collections/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const existingCollection = await db.query.collections.findFirst({
      where: eq(collections.id, id),
    });

    if (!existingCollection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // Deletes collection; cascaded foreign keys will automatically delete rules and product collections
    await db.delete(collections).where(eq(collections.id, id));

    return NextResponse.json({ success: true, message: "Collection deleted successfully" });
  } catch (error: unknown) {
    console.error("DELETE /api/admin/collections/[id] error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 }
    );
  }
}
