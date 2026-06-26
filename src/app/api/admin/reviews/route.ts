import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reviews, users, products, productVariants, orders, orderItems } from "@/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { authorize } from "@/middleware/auth";

// GET /api/admin/reviews - Retrieve list of all reviews with product and user details (Admin only)
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const results = await db.query.reviews.findMany({
      orderBy: (r, { desc }) => [desc(r.createdAt)],
      with: {
        user: true,
        product: true,
        images: {
          with: {
            media: true
          }
        }
      }
    });

    const formattedResults = await Promise.all(
      results.map(async (r) => {
        // Query variants for the product to verify purchase
        const variantsList = await db.query.productVariants.findMany({
          where: eq(productVariants.productId, r.productId),
        });
        const variantIds = variantsList.map((v) => v.id);

        let isVerifiedPurchase = false;
        if (variantIds.length > 0) {
          const buyers = await db
            .select({ userId: orders.userId })
            .from(orders)
            .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
            .where(
              and(
                eq(orders.userId, r.userId),
                inArray(orderItems.variantId, variantIds),
                eq(orders.status, "delivered")
              )
            );
          isVerifiedPurchase = buyers.length > 0;
        }

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
            .filter((ri) => ri.media)
            .map((ri) => ({
              id: ri.media.id,
              url: ri.media.url,
              altText: ri.media.altText,
            })),
        };
      })
    );

    return NextResponse.json(formattedResults, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/reviews error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
