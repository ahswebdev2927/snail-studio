import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { productBundles, productBundleItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { authorize } from "@/middleware/auth";

const createBundleSchema = z.object({
  name: z.string().min(1, "Bundle name is required").max(100, "Bundle name is too long"),
  description: z.string().optional().nullable(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().int().min(1, "Discount value must be at least 1"),
  isActive: z.boolean().default(true),
  productIds: z.array(z.string()).min(2, "A bundle must contain at least 2 products"),
});

// GET /api/bundles - List all bundles (Admin only)
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const allBundles = await db.query.productBundles.findMany({
      orderBy: (bundles, { desc }) => [desc(bundles.createdAt)],
      with: {
        items: {
          with: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(allBundles, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/bundles error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

// POST /api/bundles - Create a new bundle (Admin only)
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

    const result = createBundleSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, description, discountType, discountValue, isActive, productIds } = result.data;
    const bundleId = `bun_${nanoid(10)}`;

    const bundleRecord = await db.transaction(async (tx) => {
      // 1. Insert bundle details
      await tx.insert(productBundles).values({
        id: bundleId,
        name,
        description,
        discountType,
        discountValue,
        isActive,
      });

      // 2. Insert bundle product associations
      for (const productId of productIds) {
        await tx.insert(productBundleItems).values({
          bundleId,
          productId,
        });
      }

      // Return details
      return await tx.query.productBundles.findFirst({
        where: eq(productBundles.id, bundleId),
        with: {
          items: {
            with: {
              product: true,
            },
          },
        },
      });
    });

    return NextResponse.json(
      {
        message: "Bundle created successfully",
        bundle: bundleRecord,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/bundles error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
