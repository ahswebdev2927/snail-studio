import { db } from "@/db";
import { inventoryItems, inventoryReservations } from "@/db/schema";
import { eq, gt, inArray } from "drizzle-orm";

/**
 * Calculates the available stock for a given product variant.
 * 
 * Available Stock = Physical Stock On Hand - sum(Active Reservations)
 * 
 * @param variantId The product variant ID to calculate stock for.
 * @returns The computed available stock level (minimum 0).
 */
export async function getAvailableStock(variantId: string): Promise<number> {
  const item = await db.query.inventoryItems.findFirst({
    where: eq(inventoryItems.variantId, variantId),
    with: {
      reservations: {
        where: gt(inventoryReservations.expiresAt, new Date()),
      },
    },
  });

  if (!item) return 0;

  const reservedSum = item.reservations.reduce((sum, res) => sum + res.quantity, 0);
  return Math.max(0, item.stockLevel - reservedSum);
}

/**
 * Calculates the available stock for a list of product variants in bulk.
 * 
 * @param variantIds Array of product variant IDs to check stock for.
 * @returns A record mapping variantId to its computed available stock.
 */
export async function getAvailableStockBulk(variantIds: string[]): Promise<Record<string, number>> {
  if (variantIds.length === 0) return {};

  const items = await db.query.inventoryItems.findMany({
    where: inArray(inventoryItems.variantId, variantIds),
    with: {
      reservations: {
        where: gt(inventoryReservations.expiresAt, new Date()),
      },
    },
  });

  const result: Record<string, number> = {};
  
  // Pre-fill all requested variant IDs with 0
  for (const id of variantIds) {
    result[id] = 0;
  }

  // Calculate actual available stock for found inventory items
  for (const item of items) {
    const reservedSum = item.reservations.reduce((sum, res) => sum + res.quantity, 0);
    result[item.variantId] = Math.max(0, item.stockLevel - reservedSum);
  }

  return result;
}

/**
 * Checks if a requested quantity of a variant is available in stock.
 * 
 * @param variantId The product variant ID.
 * @param quantity The requested quantity.
 * @returns True if available stock is greater than or equal to the requested quantity.
 */
export async function isStockAvailable(variantId: string, quantity: number): Promise<boolean> {
  if (quantity <= 0) return true;
  const available = await getAvailableStock(variantId);
  return available >= quantity;
}
