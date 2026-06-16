import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { z } from "zod";

const updateCouponSchema = z.object({
  isActive: z.boolean().optional(),
  discountValue: z.number().int().min(1).optional(),
  minOrderAmount: z.number().int().min(0).optional().nullable(),
  maxDiscountAmount: z.number().int().min(0).optional().nullable(),
  usageLimit: z.number().int().min(1).optional().nullable(),
});

// PATCH /api/coupons/[id] - Update coupon fields or active status toggle (Admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: couponId } = await params;
    if (!couponId) {
      return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = updateCouponSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check if coupon exists
    const existing = await db.query.coupons.findFirst({
      where: eq(coupons.id, couponId),
    });

    if (!existing) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    const updated = await db
      .update(coupons)
      .set({
        ...result.data,
      })
      .where(eq(coupons.id, couponId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Coupon updated successfully",
      coupon: updated[0],
    }, { status: 200 });

  } catch (error: any) {
    console.error("PATCH /api/coupons/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/coupons/[id] - Permanently delete a coupon (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: couponId } = await params;
    if (!couponId) {
      return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 });
    }

    const existing = await db.query.coupons.findFirst({
      where: eq(coupons.id, couponId),
    });

    if (!existing) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    await db.delete(coupons).where(eq(coupons.id, couponId));

    return NextResponse.json({
      success: true,
      message: "Coupon deleted successfully",
    }, { status: 200 });

  } catch (error: any) {
    console.error("DELETE /api/coupons/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
