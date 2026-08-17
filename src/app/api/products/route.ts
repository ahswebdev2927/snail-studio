import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { db } from "@/db";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { 
  products, 
  productAttributeValues, 
  productVariants, 
  variantAttributeValues, 
  inventoryItems, 
  productMedia,
  productAttributeMedia
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
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
  status: z.enum(["Active", "Draft", "Out Of Stock", "Archived", "Hidden", "Coming Soon", "Launching Soon"]).default("Draft"),
  launchDate: z.string().optional().nullable(),
  launchTime: z.string().optional().nullable(),
  launchTimeZone: z.string().default("Asia/Kolkata"),
  autoPublish: z.boolean().default(false),
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
  colorMedia: z.array(z.object({
    attributeValueId: z.string(),
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

    const { searchParams } = new URL(req.url);
    const pageVal = searchParams.get("page");
    const page = pageVal ? Math.max(1, parseInt(pageVal, 10)) : null;
    const limitVal = searchParams.get("limit");
    const limit = limitVal ? Math.max(1, parseInt(limitVal, 10)) : (page ? 25 : null);
    const offset = page && limit ? (page - 1) * limit : null;

    let totalItems = 0;
    if (page !== null && limit !== null) {
      const countResult = await db
        .select({ count: sql<number>`count(${products.id})` })
        .from(products);
      totalItems = countResult[0]?.count || 0;
    }

    const queryOptions: any = {
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
      orderBy: (products: any, { desc }: any) => [desc(products.createdAt)],
    };

    if (limit !== null) {
      queryOptions.limit = limit;
    }
    if (offset !== null) {
      queryOptions.offset = offset;
    }

    const allProducts = await db.query.products.findMany(queryOptions);

    if (page !== null && limit !== null) {
      return NextResponse.json({
        products: allProducts,
        pagination: {
          totalItems,
          page,
          limit,
          totalPages: Math.ceil(totalItems / limit),
        }
      }, { status: 200 });
    }

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
      status,
      launchDate,
      launchTime,
      launchTimeZone,
      autoPublish,
      isFeatured,
      isBestSeller,
      metaTitle,
      metaDescription,
      attributeValueIds,
      media, 
      colorMedia,
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
          status,
          launchDate: launchDate || null,
          launchTime: launchTime || null,
          launchTimeZone: launchTimeZone || "Asia/Kolkata",
          autoPublish,
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

      // C.2 Insert product color-specific media connections
      if (colorMedia && colorMedia.length > 0) {
        await tx
          .insert(productAttributeMedia)
          .values(
            colorMedia.map((cm) => ({
              id: `pam_${nanoid(10)}`,
              productId,
              attributeValueId: cm.attributeValueId,
              mediaId: cm.mediaId,
              isFeatured: cm.isFeatured,
              sortOrder: cm.sortOrder,
            }))
          );
      }

      // D. Insert variants & their corresponding stocks and attribute links in batch
      if (variants.length > 0) {
        const preparedVariants = variants.map((v) => ({
          id: `var_${nanoid(10)}`,
          sku: v.sku,
          name: v.name,
          price: v.price,
          compareAtPrice: v.compareAtPrice || null,
          barcode: v.barcode || null,
          attributeValueIds: v.attributeValueIds || [],
          stockLevel: v.stock || 0,
          lowStockThreshold: v.lowStockThreshold !== undefined ? v.lowStockThreshold : 5,
        }));

        await tx.insert(productVariants).values(
          preparedVariants.map((pv) => ({
            id: pv.id,
            productId,
            sku: pv.sku,
            name: pv.name,
            price: pv.price,
            compareAtPrice: pv.compareAtPrice,
            barcode: pv.barcode,
            createdAt: now,
            updatedAt: now,
          }))
        );

        // Link variant attributes in batch
        const attributeValuesToInsert = preparedVariants.flatMap((pv) =>
          pv.attributeValueIds.map((valId) => ({
            variantId: pv.id,
            attributeValueId: valId,
          }))
        );

        if (attributeValuesToInsert.length > 0) {
          await tx.insert(variantAttributeValues).values(attributeValuesToInsert);
        }

        // Insert inventory stock items in batch
        await tx.insert(inventoryItems).values(
          preparedVariants.map((pv) => ({
            id: `inv_${nanoid(10)}`,
            variantId: pv.id,
            stockLevel: pv.stockLevel,
            lowStockThreshold: pv.lowStockThreshold,
            createdAt: now,
            updatedAt: now,
          }))
        );
      }

      return insertedProducts[0];
    });

    revalidateTag(CACHE_TAGS.PRODUCTS, "max");
    revalidateTag(CACHE_TAGS.DASHBOARD, "max");
    revalidateTag(CACHE_TAGS.ANALYTICS, "max");
    revalidatePath("/admin/products");
    revalidatePath("/");
    revalidatePath("/shop");

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
