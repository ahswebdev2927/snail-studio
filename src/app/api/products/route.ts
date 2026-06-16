import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { 
  products, 
  productAttributeValues, 
  productVariants, 
  variantAttributeValues, 
  inventoryItems, 
  productMedia 
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { authorize } from "@/middleware/auth";
import { slugify } from "@/lib/utils";

const variantSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Variant name is required"),
  price: z.number().int().min(0, "Price must be a positive integer"),
  compareAtPrice: z.number().int().min(0).optional().nullable(),
  barcode: z.string().optional().nullable(),
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  attributeValueIds: z.array(z.string()).default([]),
});

const createProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(150, "Name is too long"),
  slug: z.string().max(150, "Slug is too long").optional(),
  description: z.string().optional().nullable(),
  shortDescription: z.string().max(500, "Short description is too long").optional().nullable(),
  brandId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  isFeatured: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  metaTitle: z.string().max(100).optional().nullable(),
  metaDescription: z.string().max(250).optional().nullable(),
  attributeValueIds: z.array(z.string()).default([]),
  media: z.array(z.object({
    mediaId: z.string(),
    isFeatured: z.boolean().default(false),
    sortOrder: z.number().default(0)
  })).default([]),
  variants: z.array(variantSchema).min(1, "At least one variant is required"),
});

// GET /api/products - List all products for administration (Admin only)
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const allProducts = await db.query.products.findMany({
      with: {
        brand: true,
        category: true,
        variants: true,
        media: {
          with: {
            media: true
          }
        }
      },
      orderBy: (products, { desc }) => [desc(products.createdAt)],
    });

    return NextResponse.json(allProducts, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

// POST /api/products - Create a product and its variants (Admin only)
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

    const result = createProductSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { 
      name, 
      description, 
      shortDescription, 
      brandId, 
      categoryId, 
      isFeatured, 
      isBestSeller, 
      metaTitle, 
      metaDescription, 
      attributeValueIds, 
      media, 
      variants 
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

    // 3. Check if slug already exists
    const existing = await db.query.products.findFirst({
      where: eq(products.slug, slug),
    });

    if (existing) {
      return NextResponse.json(
        { error: `Product with slug '${slug}' already exists` },
        { status: 400 }
      );
    }

    // 4. Calculate priceMin and priceMax from variants
    const prices = variants.map(v => v.price);
    const priceMin = Math.min(...prices);
    const priceMax = Math.max(...prices);

    const now = new Date();
    const productId = `prod_${nanoid(10)}`;

    // 5. Execute transaction
    const newProduct = await db.transaction(async (tx) => {
      // A. Insert base product
      const insertedProducts = await tx
        .insert(products)
        .values({
          id: productId,
          brandId: brandId || null,
          categoryId: categoryId || null,
          name,
          slug,
          description: description || null,
          shortDescription: shortDescription || null,
          priceMin,
          priceMax,
          isFeatured,
          isBestSeller,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // B. Insert product attribute connections
      if (attributeValueIds.length > 0) {
        await tx
          .insert(productAttributeValues)
          .values(
            attributeValueIds.map((valId) => ({
              productId,
              attributeValueId: valId,
            }))
          );
      }

      // C. Insert product media connections
      if (media.length > 0) {
        await tx
          .insert(productMedia)
          .values(
            media.map((m) => ({
              productId,
              mediaId: m.mediaId,
              isFeatured: m.isFeatured,
              sortOrder: m.sortOrder,
            }))
          );
      }

      // D. Insert variants & their corresponding stocks and attribute links
      for (const v of variants) {
        const variantId = `var_${nanoid(10)}`;
        
        await tx
          .insert(productVariants)
          .values({
            id: variantId,
            productId,
            sku: v.sku,
            name: v.name,
            price: v.price,
            compareAtPrice: v.compareAtPrice || null,
            barcode: v.barcode || null,
            createdAt: now,
            updatedAt: now,
          });

        // Link variant attributes
        if (v.attributeValueIds.length > 0) {
          await tx
            .insert(variantAttributeValues)
            .values(
              v.attributeValueIds.map((valId) => ({
                variantId,
                attributeValueId: valId,
              }))
            );
        }

        // Insert inventory stock item
        const inventoryId = `inv_${nanoid(10)}`;
        await tx
          .insert(inventoryItems)
          .values({
            id: inventoryId,
            variantId,
            stockLevel: v.stock,
            lowStockThreshold: v.lowStockThreshold,
            createdAt: now,
            updatedAt: now,
          });
      }

      return insertedProducts[0];
    });

    return NextResponse.json({
      success: true,
      message: "Product created successfully",
      product: newProduct,
    }, { status: 201 });

  } catch (error: unknown) {
    console.error("POST /api/products error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 }
    );
  }
}
