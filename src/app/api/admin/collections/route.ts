import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { collections, collectionRules, productCollections } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { authorize } from "@/middleware/auth";
import { slugify } from "@/lib/utils";
import { compileDynamicCollection } from "@/services/collections/collections.service";

const createCollectionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  slug: z
    .string()
    .max(100, "Slug is too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional()
    .or(z.literal("")),
  description: z.string().max(1000, "Description is too long").optional().nullable(),
  type: z.enum(["manual", "dynamic"]),
  isActive: z.boolean().optional(),
  showOnHomepage: z.boolean().optional(),
  showInDropdown: z.boolean().optional(),
  showInNavbar: z.boolean().optional(),
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

// GET /api/admin/collections - list collections with rules and count
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const allCollections = await db.query.collections.findMany({
      orderBy: asc(collections.sortOrder),
      with: {
        rules: true,
        products: true,
      },
    });

    return NextResponse.json(allCollections);
  } catch (error: unknown) {
    console.error("GET /api/admin/collections error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 }
    );
  }
}

// POST /api/admin/collections - create a collection
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

    const result = createCollectionSchema.safeParse(body);
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
      isActive = true,
      showOnHomepage = false,
      showInDropdown = false,
      showInNavbar = false,
      sortOrder = 0,
      productIds = [],
      rules = [],
    } = result.data;

    let slug = result.data.slug;
    if (!slug) {
      slug = slugify(name);
    }

    if (!slug) {
      return NextResponse.json(
        { error: "Could not generate a valid slug from name" },
        { status: 400 }
      );
    }

    // Check slug conflicts
    const conflicting = await db.query.collections.findFirst({
      where: eq(collections.slug, slug),
    });
    if (conflicting) {
      return NextResponse.json(
        { error: `Collection with slug '${slug}' already exists` },
        { status: 400 }
      );
    }

    const newCollectionId = `col_${nanoid(10)}`;

    await db.transaction(async (tx) => {
      // 1. Insert collection
      await tx.insert(collections).values({
        id: newCollectionId,
        name,
        slug,
        description: description || null,
        type,
        isActive,
        showOnHomepage,
        showInDropdown,
        showInNavbar,
        sortOrder,
      });

      // 2. Insert bindings depending on type
      if (type === "manual" && productIds.length > 0) {
        const valuesToInsert = productIds.map((pId) => ({
          productId: pId,
          collectionId: newCollectionId,
        }));
        await tx.insert(productCollections).values(valuesToInsert);
      } else if (type === "dynamic" && rules.length > 0) {
        const valuesToInsert = rules.map((r) => ({
          id: `rule_${nanoid(10)}`,
          collectionId: newCollectionId,
          column: r.column,
          relation: r.relation,
          value: r.value,
        }));
        await tx.insert(collectionRules).values(valuesToInsert);
      }
    });

    // 3. Compile dynamic collection immediately if type is dynamic
    if (type === "dynamic") {
      await compileDynamicCollection(newCollectionId);
    }

    // Fetch and return the created collection
    const created = await db.query.collections.findFirst({
      where: eq(collections.id, newCollectionId),
      with: {
        rules: true,
        products: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/admin/collections error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 }
    );
  }
}
