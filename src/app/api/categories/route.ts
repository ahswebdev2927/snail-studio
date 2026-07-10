import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { authorize } from "@/middleware/auth";
import { slugify } from "@/lib/utils";

const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  slug: z
    .string()
    .max(100, "Slug is too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional()
    .or(z.literal("")),
  parentId: z.string().max(100).optional().nullable(),
  description: z.string().max(1000, "Description is too long").optional().nullable(),
  image: z.string().url("Invalid image URL").optional().nullable().or(z.literal("")),
  showOnHomepage: z.boolean().optional(),
  showInDropdown: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

interface CategoryItem {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  showOnHomepage: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryTreeNode extends CategoryItem {
  children: CategoryTreeNode[];
}

// Helper function to build a hierarchical tree from a flat list
function buildCategoryTree(flatList: CategoryItem[]): CategoryTreeNode[] {
  const tree: CategoryTreeNode[] = [];
  const map: Record<string, CategoryTreeNode> = {};

  // Initialize all items in the map with an empty children array
  flatList.forEach((item) => {
    map[item.id] = { ...item, children: [] };
  });

  // Build the tree hierarchy
  flatList.forEach((item) => {
    const mappedNode = map[item.id];
    if (item.parentId && map[item.parentId]) {
      map[item.parentId].children.push(mappedNode);
    } else {
      tree.push(mappedNode);
    }
  });

  // Recursive sort function to sort tree levels by sortOrder, then alphabetically
  const sortTreeNodes = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => {
      const diff = (a.sortOrder || 0) - (b.sortOrder || 0);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((node) => {
      if (node.children.length > 0) {
        sortTreeNodes(node.children);
      }
    });
  };

  sortTreeNodes(tree);
  return tree;
}

// GET /api/categories - list categories (supports flat list or nested tree structure)
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const tree = searchParams.get("tree") === "true";

    const allCategories = await db.query.categories.findMany({
      orderBy: (c, { asc }) => [asc(c.sortOrder), asc(c.name)],
    });

    if (tree) {
      const treeStructure = buildCategoryTree(allCategories);
      return NextResponse.json(treeStructure);
    }

    return NextResponse.json(allCategories);
  } catch (error: unknown) {
    console.error("GET /api/categories error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 }
    );
  }
}

// POST /api/categories - create a category (Admin only)
export async function POST(req: NextRequest) {
  try {
    // 1. Authorize Admin
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

    const result = createCategorySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, parentId, description, image, showOnHomepage, showInDropdown, sortOrder } = result.data;
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

    // 4. Validate parent category existence if parentId is provided
    if (parentId) {
      const parent = await db.query.categories.findFirst({
        where: eq(categories.id, parentId),
      });

      if (!parent) {
        return NextResponse.json(
          { error: `Parent category with ID '${parentId}' does not exist` },
          { status: 400 }
        );
      }
    }

    // 5. Check if slug already exists
    const existing = await db.query.categories.findFirst({
      where: eq(categories.slug, slug),
    });

    if (existing) {
      return NextResponse.json(
        { error: `Category with slug '${slug}' already exists` },
        { status: 400 }
      );
    }

    // 6. Insert Category
    const now = new Date();
    const newCategoryId = `cat_${nanoid(10)}`;
    const inserted = await db
      .insert(categories)
      .values({
        id: newCategoryId,
        parentId: parentId || null,
        name,
        slug,
        description: description || null,
        image: image || null,
        showOnHomepage: showOnHomepage ?? false,
        showInDropdown: showInDropdown ?? false,
        sortOrder: sortOrder ?? 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/categories error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 }
    );
  }
}
