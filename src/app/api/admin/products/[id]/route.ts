import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { 
  products, 
  productAttributeValues, 
  productVariants, 
  productMedia,
  userAuditLogs
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { authorize } from "@/middleware/auth";
import { slugify } from "@/lib/utils";

const updateProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(150, "Name is too long"),
  slug: z.string().max(150, "Slug is too long").optional(),
  description: z.string().optional().nullable(),
  shortDescription: z.string().max(500, "Short description is too long").optional().nullable(),
  brandId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  status: z.enum(["Active", "Draft", "Out Of Stock", "Archived", "Hidden", "Coming Soon", "Launching Soon"]),
  launchDate: z.string().optional().nullable(),
  launchTime: z.string().optional().nullable(),
  launchTimeZone: z.string().default("Asia/Kolkata"),
  autoPublish: z.boolean().default(false),
  isFeatured: z.boolean(),
  isBestSeller: z.boolean(),
  isNewArrival: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  metaTitle: z.string().max(100).optional().nullable(),
  metaDescription: z.string().max(250).optional().nullable(),
  ogImage: z.string().optional().nullable(),
  attributeValueIds: z.array(z.string()).default([]),
  media: z.array(z.object({
    mediaId: z.string(),
    isFeatured: z.boolean().default(false),
    sortOrder: z.number().default(0)
  })).default([]),
});

// GET /api/admin/products/[id] - Fetch complete product details for edit (Admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: productId } = await params;

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const productData = await db.query.products.findFirst({
      where: eq(products.id, productId),
      with: {
        brand: true,
        category: true,
        variants: {
          with: {
            attributes: true,
            inventory: true,
          },
        },
        media: {
          with: {
            media: true,
          },
        },
        attributeValues: true,
      },
    });

    if (!productData) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Map database structure to clean API response format
    const responseData = {
      product: {
        id: productData.id,
        name: productData.name,
        slug: productData.slug,
        description: productData.description,
        shortDescription: productData.shortDescription,
        brandId: productData.brandId,
        categoryId: productData.categoryId,
        status: productData.status,
        launchDate: productData.launchDate,
        launchTime: productData.launchTime,
        launchTimeZone: productData.launchTimeZone,
        autoPublish: productData.autoPublish,
        isActive: productData.isActive,
        isFeatured: productData.isFeatured,
        isBestSeller: productData.isBestSeller,
        isNewArrival: productData.isNewArrival,
        isTrending: productData.isTrending,
      },
      media: productData.media.map(pm => ({
        mediaId: pm.mediaId,
        url: pm.media?.url,
        isFeatured: pm.isFeatured,
        sortOrder: pm.sortOrder,
        resourceType: pm.media?.resourceType || "image",
      })),
      seo: {
        metaTitle: productData.metaTitle,
        metaDescription: productData.metaDescription,
        ogImage: productData.ogImage,
      },
      variants: productData.variants.map(v => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        price: v.price / 100, // Convert paise to decimal rupees
        compareAtPrice: v.compareAtPrice ? v.compareAtPrice / 100 : null,
        barcode: v.barcode,
        status: v.status,
        stock: v.inventory?.stockLevel ?? 0,
        lowStockThreshold: v.inventory?.lowStockThreshold ?? 5,
        attributeValueIds: v.attributes.map(a => a.attributeValueId),
      })),
      attributes: productData.attributeValues.map(av => av.attributeValueId),
      brand: productData.brand,
      category: productData.category,
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/products/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/products/[id] - Update product details (Admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authorize Admin
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: productId } = await params;
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    // 2. Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = updateProductSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;
    let slug = data.slug || slugify(data.name);

    // 3. Fetch current product data for difference tracking (Audit logs)
    const oldProduct = await db.query.products.findFirst({
      where: eq(products.id, productId),
      with: {
        media: true,
        attributeValues: true,
      }
    });

    if (!oldProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check slug availability if changed
    if (slug !== oldProduct.slug) {
      const existingSlug = await db.query.products.findFirst({
        where: eq(products.slug, slug),
      });
      if (existingSlug && existingSlug.id !== productId) {
        slug = `${slug}-${nanoid(4).toLowerCase()}`; // Append unique suffix
      }
    }

    // 4. Trace changes for Audit Logs
    const auditChanges: Record<string, any> = {};

    if (oldProduct.status !== data.status) {
      auditChanges.status = { old: oldProduct.status, new: data.status };
    }

    const oldSeo = {
      metaTitle: oldProduct.metaTitle,
      metaDescription: oldProduct.metaDescription,
      ogImage: oldProduct.ogImage
    };
    const newSeo = {
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
      ogImage: data.ogImage || null
    };
    if (JSON.stringify(oldSeo) !== JSON.stringify(newSeo)) {
      auditChanges.seo = { old: oldSeo, new: newSeo };
    }

    const oldAttrs = oldProduct.attributeValues.map(av => av.attributeValueId).sort();
    const newAttrs = [...data.attributeValueIds].sort();
    if (JSON.stringify(oldAttrs) !== JSON.stringify(newAttrs)) {
      auditChanges.attributes = { old: oldAttrs, new: newAttrs };
    }

    // Basic fields changes
    const basicFields = [
      "name", "slug", "description", "shortDescription", "brandId", "categoryId",
      "isFeatured", "isBestSeller", "isNewArrival", "isTrending",
      "launchDate", "launchTime", "launchTimeZone", "autoPublish"
    ];
    const basicChanges: Record<string, any> = {};
    basicFields.forEach(field => {
      const oldVal = (oldProduct as any)[field];
      const newVal = (data as any)[field];
      if (oldVal !== newVal) {
        basicChanges[field] = { old: oldVal, new: newVal };
      }
    });
    if (Object.keys(basicChanges).length > 0) {
      auditChanges.basicInfo = basicChanges;
    }

    const now = new Date();

    // 5. Run update transaction
    await db.transaction(async (tx) => {
      // A. Update products table
      await tx
        .update(products)
        .set({
          name: data.name,
          slug,
          description: data.description || null,
          shortDescription: data.shortDescription || null,
          brandId: data.brandId || null,
          categoryId: data.categoryId || null,
          status: data.status,
          isActive: data.status !== "Draft" && data.status !== "Archived",
          launchDate: data.launchDate || null,
          launchTime: data.launchTime || null,
          launchTimeZone: data.launchTimeZone || "Asia/Kolkata",
          autoPublish: data.autoPublish,
          isFeatured: data.isFeatured,
          isBestSeller: data.isBestSeller,
          isNewArrival: data.isNewArrival,
          isTrending: data.isTrending,
          metaTitle: data.metaTitle || null,
          metaDescription: data.metaDescription || null,
          ogImage: data.ogImage || null,
          updatedAt: now,
        })
        .where(eq(products.id, productId));

      // B. Update product attribute connections (Delete & Insert)
      await tx
        .delete(productAttributeValues)
        .where(eq(productAttributeValues.productId, productId));

      if (data.attributeValueIds.length > 0) {
        await tx
          .insert(productAttributeValues)
          .values(
            data.attributeValueIds.map((valId) => ({
              productId,
              attributeValueId: valId,
            }))
          );
      }

      // C. Update product media connections (Delete & Insert)
      await tx
        .delete(productMedia)
        .where(eq(productMedia.productId, productId));

      if (data.media.length > 0) {
        await tx
          .insert(productMedia)
          .values(
            data.media.map((m) => ({
              productId,
              mediaId: m.mediaId,
              isFeatured: m.isFeatured,
              sortOrder: m.sortOrder,
            }))
          );
      }

      // D. Record audit logs if there are changes
      if (Object.keys(auditChanges).length > 0) {
        await tx.insert(userAuditLogs).values({
          id: `al_${nanoid(12)}`,
          userId: auth.user!.id,
          action: "update_product",
          entityType: "product",
          entityId: productId,
          changes: JSON.stringify(auditChanges),
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
          createdAt: now,
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Product updated successfully",
    }, { status: 200 });

  } catch (error: any) {
    console.error("PATCH /api/admin/products/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
