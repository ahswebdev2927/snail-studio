import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { authorize } from "@/middleware/auth";

const createCouponSchema = z.object({
  code: z
    .string()
    .min(1, "Coupon code is required")
    .max(50, "Coupon code is too long")
    .transform((val) => val.toUpperCase().trim()),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().int().min(1, "Discount value must be at least 1"),
  minOrderAmount: z.number().int().min(0).optional().nullable(),
  maxDiscountAmount: z.number().int().min(0).optional().nullable(),
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
  usageLimit: z.number().int().min(1).optional().nullable(),
  isActive: z.boolean().default(true),
}).refine((data) => data.startDate <= data.endDate, {
  message: "Start date must be before or equal to end date",
  path: ["startDate"],
});

// GET /api/coupons - List all coupons in the catalog (Admin only)
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const allCoupons = await db.query.coupons.findMany({
      orderBy: (coupons, { desc }) => [desc(coupons.createdAt)],
    });

    return NextResponse.json(allCoupons, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/coupons error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

// POST /api/coupons - Create a new coupon rule (Admin only)
export async function POST(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = createCouponSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      code,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      startDate,
      endDate,
      usageLimit,
      isActive,
    } = result.data;

    // Validate percentage constraint
    if (discountType === "percentage" && discountValue > 100) {
      return NextResponse.json(
        { error: "Validation failed", details: { discountValue: ["Percentage discount value cannot exceed 100%"] } },
        { status: 400 }
      );
    }

    // Check code uniqueness
    const existing = await db.query.coupons.findFirst({
      where: eq(coupons.code, code),
    });

    if (existing) {
      return NextResponse.json(
        { error: `Coupon code '${code}' already exists` },
        { status: 400 }
      );
    }

    const couponId = `coup_${nanoid(10)}`;

    const newCoupon = await db.insert(coupons).values({
      id: couponId,
      code,
      discountType,
      discountValue,
      minOrderAmount: minOrderAmount || null,
      maxDiscountAmount: maxDiscountAmount || null,
      startDate,
      endDate,
      usageLimit: usageLimit || null,
      isActive,
      usageCount: 0,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json({
      success: true,
      message: "Coupon created successfully",
      coupon: newCoupon[0],
    }, { status: 201 });

  } catch (error: any) {
    console.error("POST /api/coupons error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
