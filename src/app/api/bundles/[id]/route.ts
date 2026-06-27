import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { productBundles, productBundleItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authorize } from "@/middleware/auth";

const updateBundleSchema = z.object({
  name: z.string().min(1, "Bundle name is required").max(100, "Bundle name is too long").optional(),
  description: z.string().optional().nullable(),
  discountType: z.enum(["percentage", "fixed"]).optional(),
  discountValue: z.number().int().min(1, "Discount value must be at least 1").optional(),
  isActive: z.boolean().optional(),
  productIds: z.array(z.string()).min(2, "A bundle must contain at least 2 products").optional(),
});

// PATCH /api/bundles/[id] - Update a bundle (Admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: bundleId } = await params;
    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = updateBundleSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check if bundle exists
    const existing = await db.query.productBundles.findFirst({
      where: eq(productBundles.id, bundleId),
    });

    if (!existing) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    }

    const { name, description, discountType, discountValue, isActive, productIds } = result.data;

    const updatedRecord = await db.transaction(async (tx) => {
      // 1. Update bundle details if provided
      if (name !== undefined || description !== undefined || discountType !== undefined || discountValue !== undefined || isActive !== undefined) {
        await tx
          .update(productBundles)
          .set({
            name: name !== undefined ? name : undefined,
            description: description !== undefined ? description : undefined,
            discountType: discountType !== undefined ? discountType : undefined,
            discountValue: discountValue !== undefined ? discountValue : undefined,
            isActive: isActive !== undefined ? isActive : undefined,
            updatedAt: new Date(),
          })
          .where(eq(productBundles.id, bundleId));
      }

      // 2. Update product links if provided
      if (productIds !== undefined) {
        // Delete existing items
        await tx.delete(productBundleItems).where(eq(productBundleItems.bundleId, bundleId));

        // Insert new items
        for (const productId of productIds) {
          await tx.insert(productBundleItems).values({
            bundleId,
            productId,
          });
        }
      }

      // Return updated bundle
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

    return NextResponse.json({
      message: "Bundle updated successfully",
      bundle: updatedRecord,
    });
  } catch (error: any) {
    console.error("PATCH /api/bundles/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/bundles/[id] - Permanently delete a bundle (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: bundleId } = await params;
    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required" }, { status: 400 });
    }

    const existing = await db.query.productBundles.findFirst({
      where: eq(productBundles.id, bundleId),
    });

    if (!existing) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    }

    // Cascade delete is handled by schema constraints on database level,
    // but deleting from productBundles will trigger it.
    await db.delete(productBundles).where(eq(productBundles.id, bundleId));

    return NextResponse.json({
      message: "Bundle deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE /api/bundles/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
