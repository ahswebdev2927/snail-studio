import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reviews, users, products, productVariants, orders, orderItems } from "@/db/schema";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { authorize } from "@/middleware/auth";

// GET /api/admin/reviews - Retrieve list of all reviews with product and user details (Admin only)
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
    const limit = limitVal ? Math.max(1, parseInt(limitVal, 10)) : null;
    const offset = page && limit ? (page - 1) * limit : null;

    // Optional Count Query
    let totalItems = 0;
    if (page !== null && limit !== null) {
      const totalCountResult = await db
        .select({ count: sql<number>`count(${reviews.id})` })
        .from(reviews);
      totalItems = totalCountResult[0]?.count || 0;
    }

    const queryOptions: any = {
      orderBy: (r: any, { desc }: any) => [desc(r.createdAt)],
      with: {
        user: true,
        product: true,
        images: {
          with: {
            media: true
          }
        }
      }
    };

    if (limit !== null) {
      queryOptions.limit = limit;
    }
    if (offset !== null) {
      queryOptions.offset = offset;
    }

    const results = await db.query.reviews.findMany(queryOptions);

    // 1. Batch fetch all variants for the fetched product IDs
    const productIds = Array.from(new Set(results.map((r) => r.productId).filter(Boolean)));
    const productVariantsMap = new Map<string, string[]>();

    if (productIds.length > 0) {
      const variantsList = await db.query.productVariants.findMany({
        where: inArray(productVariants.productId, productIds),
      });

      for (const v of variantsList) {
        if (!productVariantsMap.has(v.productId)) {
          productVariantsMap.set(v.productId, []);
        }
        productVariantsMap.get(v.productId)!.push(v.id);
      }
    }

    // 2. Batch fetch all delivered order items for these users to verify purchases
    const userIds = Array.from(new Set(results.map((r) => r.userId).filter(Boolean)));
    const allVariantIds = Array.from(
      new Set(Array.from(productVariantsMap.values()).flat())
    );

    const verifiedPurchasesSet = new Set<string>();

    if (userIds.length > 0 && allVariantIds.length > 0) {
      const buyers = await db
        .select({ userId: orders.userId, variantId: orderItems.variantId })
        .from(orders)
        .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
        .where(
          and(
            inArray(orders.userId, userIds),
            inArray(orderItems.variantId, allVariantIds),
            eq(orders.status, "delivered")
          )
        );

      for (const b of buyers) {
        verifiedPurchasesSet.add(`${b.userId}_${b.variantId}`);
      }
    }

    // 3. Construct response using in-memory lookups
    const formattedResults = results.map((r: any) => {
      const variantIds = productVariantsMap.get(r.productId) || [];
      const isVerifiedPurchase = variantIds.some((vid) =>
        verifiedPurchasesSet.has(`${r.userId}_${vid}`)
      );

      return {
        id: r.id,
        productId: r.productId,
        userId: r.userId,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        isApproved: r.isApproved,
        createdAt: r.createdAt,
        reviewerName: r.user?.name || "Shopper",
        reviewerPhone: r.user?.phoneNumber || null,
        reviewerEmail: r.user?.email || null,
        productName: r.product?.name || "Unknown Product",
        isVerifiedPurchase,
        images: r.images
          .filter((ri: any) => ri.media)
          .map((ri: any) => ({
            id: ri.media.id,
            url: ri.media.url,
            altText: ri.media.altText,
          })),
      };
    });

    if (page !== null && limit !== null) {
      return NextResponse.json({
        reviews: formattedResults,
        pagination: {
          totalItems,
          page,
          limit,
          totalPages: Math.ceil(totalItems / limit),
        }
      }, { status: 200 });
    }

    return NextResponse.json(formattedResults, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/reviews error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
