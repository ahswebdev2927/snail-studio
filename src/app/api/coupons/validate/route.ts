import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const validateCouponSchema = z.object({
  code: z.string().min(1, "Coupon code is required").transform((val) => val.toUpperCase().trim()),
  subtotal: z.number().int().min(0, "Subtotal must be a positive integer"),
});

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = validateCouponSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { code, subtotal } = result.data;

    // 1. Try querying the database
    let coupon = await db.query.coupons.findFirst({
      where: and(eq(coupons.code, code), eq(coupons.isActive, true)),
    });

    // 2. Fallback to hardcoded promo codes if DB does not have it
    if (!coupon) {
      if (code === "SNAILGLAM" || code === "LUXENAILS10") {
        coupon = {
          id: `fallback_${code.toLowerCase()}`,
          code: code,
          discountType: "percentage",
          discountValue: 10, // 10% off
          minOrderAmount: 0,
          maxDiscountAmount: null,
          startDate: new Date("2026-01-01"),
          endDate: new Date("2030-12-31"),
          usageLimit: null,
          usageCount: 0,
          isActive: true,
          createdAt: new Date(),
        };
      }
    }

    // 3. Check if coupon exists
    if (!coupon) {
      return NextResponse.json({ error: "Invalid coupon code or coupon has expired" }, { status: 404 });
    }

    // 4. Validate dates
    const now = new Date();
    if (coupon.startDate && now < new Date(coupon.startDate)) {
      return NextResponse.json({ error: "Coupon is not active yet" }, { status: 400 });
    }
    if (coupon.endDate && now > new Date(coupon.endDate)) {
      return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
    }

    // 5. Validate usage limits
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({ error: "Coupon usage limit has been reached" }, { status: 400 });
    }

    // 6. Validate minimum order subtotal requirement
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      const minAmountInRupees = (coupon.minOrderAmount / 100).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
      });
      return NextResponse.json(
        { error: `This coupon requires a minimum subtotal of ${minAmountInRupees}` },
        { status: 400 }
      );
    }

    // 7. Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = Math.floor((subtotal * coupon.discountValue) / 100);
      if (coupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    } else if (coupon.discountType === "fixed") {
      discountAmount = Math.min(coupon.discountValue, subtotal);
    }

    return NextResponse.json(
      {
        valid: true,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discountAmount,
        newTotal: subtotal - discountAmount,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("POST /api/coupons/validate error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
