import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reviews, users, products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { authorize } from "@/middleware/auth";

// GET /api/admin/reviews - Retrieve list of all reviews with product and user details (Admin only)
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const results = await db
      .select({
        id: reviews.id,
        productId: reviews.productId,
        userId: reviews.userId,
        rating: reviews.rating,
        title: reviews.title,
        comment: reviews.comment,
        isApproved: reviews.isApproved,
        createdAt: reviews.createdAt,
        reviewerName: users.name,
        reviewerPhone: users.phoneNumber,
        reviewerEmail: users.email,
        productName: products.name,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .innerJoin(products, eq(reviews.productId, products.id))
      .orderBy(desc(reviews.createdAt));

    return NextResponse.json(results, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/reviews error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
