import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryItems, inventoryReservations, productVariants, products } from "@/db/schema";
import { eq, gt, and, sql } from "drizzle-orm";
import { authorize } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    // 1. Authorize as Admin
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    // 2. Subquery to sum active reservations grouped by inventory item ID
    const activeReservationsSubquery = db
      .select({
        inventoryItemId: inventoryReservations.inventoryItemId,
        reservedQuantity: sql<number>`SUM(${inventoryReservations.quantity})`.as("reserved_quantity"),
      })
      .from(inventoryReservations)
      .where(gt(inventoryReservations.expiresAt, new Date()))
      .groupBy(inventoryReservations.inventoryItemId)
      .as("active_res");

    // 3. Fetch all inventory items with variant price and details
    const results = await db
      .select({
        id: inventoryItems.id,
        variantId: inventoryItems.variantId,
        stockLevel: inventoryItems.stockLevel,
        lowStockThreshold: inventoryItems.lowStockThreshold,
        sku: productVariants.sku,
        variantName: productVariants.name,
        price: productVariants.price,
        productName: products.name,
        reservedQuantity: sql<number>`COALESCE(${activeReservationsSubquery.reservedQuantity}, 0)`.mapWith(Number),
      })
      .from(inventoryItems)
      .innerJoin(productVariants, eq(inventoryItems.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .leftJoin(activeReservationsSubquery, eq(inventoryItems.id, activeReservationsSubquery.inventoryItemId));

    // 4. Calculate available stock and replenish estimations in memory
    const lowStockItems: any[] = [];
    const outOfStockItems: any[] = [];
    let totalRestockCost = 0;

    results.forEach(row => {
      const availableStock = Math.max(0, row.stockLevel - row.reservedQuantity);
      
      // Safe restocking baseline: threshold + 10 units
      const restockTarget = row.lowStockThreshold + 10;
      const restockQty = Math.max(0, restockTarget - availableStock);
      const restockCost = restockQty * row.price;

      const itemData = {
        id: row.id,
        variantId: row.variantId,
        sku: row.sku,
        variantName: row.variantName,
        productName: row.productName,
        stockLevel: row.stockLevel,
        reservedQuantity: row.reservedQuantity,
        availableStock,
        lowStockThreshold: row.lowStockThreshold,
        price: row.price,
        restockQty,
        restockCost
      };

      if (availableStock === 0) {
        outOfStockItems.push(itemData);
        totalRestockCost += restockCost;
      } else if (availableStock <= row.lowStockThreshold) {
        lowStockItems.push(itemData);
        totalRestockCost += restockCost;
      }
    });

    return NextResponse.json({
      summary: {
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        totalRestockCost,
      },
      lowStockItems,
      outOfStockItems
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/analytics/inventory error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
