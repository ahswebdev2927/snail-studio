import { NextRequest, NextResponse } from "next/server";
import { validateCouponSchema } from "@/lib/validators/catalog";
import { validateCoupon } from "@/services/checkout/coupon-engine.service";

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

    const { code, subtotal, cartId, userId } = result.data;

    // Call Coupon Engine
    const validationResult = await validateCoupon(code, subtotal, cartId, userId);

    if (!validationResult.valid) {
      // Return 404 if coupon is not found, or 400 if validation constraints fail
      const statusCode = validationResult.error?.includes("Invalid coupon code") ? 404 : 400;
      return NextResponse.json({ error: validationResult.error }, { status: statusCode });
    }

    return NextResponse.json(
      {
        valid: true,
        code: validationResult.coupon.code,
        discountType: validationResult.coupon.discountType,
        discountValue: validationResult.coupon.discountValue,
        discountAmount: validationResult.discountAmount,
        newTotal: validationResult.newTotal,
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
