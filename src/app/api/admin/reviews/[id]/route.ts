import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { z } from "zod";

const patchSchema = z.object({
  isApproved: z.boolean(),
});

// PATCH /api/admin/reviews/[id] - Moderate review approval status (Admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: reviewId } = await params;
    if (!reviewId) {
      return NextResponse.json({ error: "Review ID is required" }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = patchSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { isApproved } = result.data;

    // Check if review exists
    const existing = await db.query.reviews.findFirst({
      where: eq(reviews.id, reviewId),
    });

    if (!existing) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const updated = await db
      .update(reviews)
      .set({ isApproved, })
      .where(eq(reviews.id, reviewId))
      .returning();

    return NextResponse.json({
      success: true,
      message: `Review successfully ${isApproved ? "approved" : "unapproved"}`,
      review: updated[0],
    }, { status: 200 });

  } catch (error: any) {
    console.error("PATCH /api/admin/reviews/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/reviews/[id] - Permanently delete a review (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: reviewId } = await params;
    if (!reviewId) {
      return NextResponse.json({ error: "Review ID is required" }, { status: 400 });
    }

    const existing = await db.query.reviews.findFirst({
      where: eq(reviews.id, reviewId),
    });

    if (!existing) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    await db.delete(reviews).where(eq(reviews.id, reviewId));

    return NextResponse.json({
      success: true,
      message: "Review deleted successfully",
    }, { status: 200 });

  } catch (error: any) {
    console.error("DELETE /api/admin/reviews/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
