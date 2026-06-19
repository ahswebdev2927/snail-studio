import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { 
  productVariants, 
  inventoryItems, 
  inventoryTransactions,
  userAuditLogs
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { authorize } from "@/middleware/auth";

const updateVariantSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().nullable().optional(),
  price: z.number().min(0.01, "Price must be positive"), // In decimal rupees, converted to paise
  compareAtPrice: z.number().min(0).nullable().optional(), // In decimal rupees, converted to paise
  stock: z.number().int().min(0).optional(),
  status: z.enum(["Active", "Disabled", "Archived"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    // 1. Authorize Admin
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: productId, variantId } = await params;
    if (!productId || !variantId) {
      return NextResponse.json({ error: "Product ID and Variant ID are required" }, { status: 400 });
    }

    // 2. Parse and validate body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = updateVariantSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;
    const priceInPaise = Math.round(data.price * 100);
    const compareAtPriceInPaise = data.compareAtPrice ? Math.round(data.compareAtPrice * 100) : null;

    // 3. Fetch current variant and its inventory
    const variant = await db.query.productVariants.findFirst({
      where: and(
        eq(productVariants.id, variantId),
        eq(productVariants.productId, productId)
      ),
      with: {
        inventory: true
      }
    });

    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const now = new Date();
    const auditChanges: Record<string, any> = {};

    // 4. Perform transaction
    await db.transaction(async (tx) => {
      // A. Stock & Inventory Update
      if (data.stock !== undefined && variant.inventory) {
        const previousStock = variant.inventory.stockLevel;
        const newStock = data.stock;
        
        if (previousStock !== newStock) {
          const diff = newStock - previousStock;
          const type = diff > 0 ? "inbound" : "outbound";
          
          // Update inventory stock level
          await tx
            .update(inventoryItems)
            .set({
              stockLevel: newStock,
              updatedAt: now,
            })
            .where(eq(inventoryItems.id, variant.inventory.id));

          // Log inventory transaction
          const reference = `Manual adjustment. Previous: ${previousStock}, New: ${newStock}, Diff: ${diff}, Admin: ${auth.user!.email || auth.user!.id}`;
          await tx.insert(inventoryTransactions).values({
            id: `it_${nanoid(12)}`,
            inventoryItemId: variant.inventory.id,
            type,
            quantity: Math.abs(diff),
            reference,
            createdAt: now,
          });

          auditChanges.stock = { old: previousStock, new: newStock };
        }
      }

      // B. Variant field changes detection
      const fieldChanges: Record<string, any> = {};
      if (variant.sku !== data.sku) fieldChanges.sku = { old: variant.sku, new: data.sku };
      if (variant.barcode !== (data.barcode || null)) fieldChanges.barcode = { old: variant.barcode, new: data.barcode || null };
      if (variant.price !== priceInPaise) fieldChanges.price = { old: variant.price / 100, new: data.price };
      
      const oldCompare = variant.compareAtPrice ? variant.compareAtPrice / 100 : null;
      if (oldCompare !== (data.compareAtPrice || null)) {
        fieldChanges.compareAtPrice = { old: oldCompare, new: data.compareAtPrice || null };
      }

      if (data.status && variant.status !== data.status) {
        fieldChanges.status = { old: variant.status, new: data.status };
      }

      if (Object.keys(fieldChanges).length > 0) {
        auditChanges.variantFields = fieldChanges;

        // Update productVariants table
        await tx
          .update(productVariants)
          .set({
            sku: data.sku,
            barcode: data.barcode || null,
            price: priceInPaise,
            compareAtPrice: compareAtPriceInPaise,
            status: data.status || variant.status,
            updatedAt: now,
          })
          .where(eq(productVariants.id, variantId));
      }

      // C. Record audit logs if there are changes
      if (Object.keys(auditChanges).length > 0) {
        await tx.insert(userAuditLogs).values({
          id: `al_${nanoid(12)}`,
          userId: auth.user!.id,
          action: "update_variant",
          entityType: "variant",
          entityId: variantId,
          changes: JSON.stringify(auditChanges),
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
          createdAt: now,
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Variant updated successfully",
    }, { status: 200 });

  } catch (error: any) {
    console.error("PATCH /api/admin/products/[id]/variants/[variantId] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
