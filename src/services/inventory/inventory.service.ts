import { db } from "@/db";
import { inventoryItems, inventoryReservations, inventoryTransactions, productVariants, products } from "@/db/schema";
import { eq, gt, lt, inArray, and, or, like, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Calculates the available stock for a given product variant, optionally using a transaction client.
 * 
 * Available Stock = Physical Stock On Hand - sum(Active Reservations)
 * 
 * @param variantId The product variant ID to calculate stock for.
 * @param tx Optional transaction client.
 * @returns The computed available stock level (minimum 0).
 */
export async function getAvailableStock(variantId: string, tx?: any): Promise<number> {
  const client = tx || db;
  const item = await client.query.inventoryItems.findFirst({
    where: eq(inventoryItems.variantId, variantId),
    with: {
      reservations: {
        where: gt(inventoryReservations.expiresAt, new Date()),
      },
    },
  });

  if (!item) return 0;

  const reservedSum = item.reservations.reduce((sum: number, res: any) => sum + res.quantity, 0);
  return Math.max(0, item.stockLevel - reservedSum);
}

/**
 * Calculates the available stock for a list of product variants in bulk, optionally using a transaction client.
 * 
 * @param variantIds Array of product variant IDs to check stock for.
 * @param tx Optional transaction client.
 * @returns A record mapping variantId to its computed available stock.
 */
export async function getAvailableStockBulk(variantIds: string[], tx?: any): Promise<Record<string, number>> {
  if (variantIds.length === 0) return {};

  const client = tx || db;
  const items = await client.query.inventoryItems.findMany({
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
    const reservedSum = item.reservations.reduce((sum: number, res: any) => sum + res.quantity, 0);
    result[item.variantId] = Math.max(0, item.stockLevel - reservedSum);
  }

  return result;
}

/**
 * Checks if a requested quantity of a variant is available in stock, optionally using a transaction client.
 * 
 * @param variantId The product variant ID.
 * @param quantity The requested quantity.
 * @param tx Optional transaction client.
 * @returns True if available stock is greater than or equal to the requested quantity.
 */
export async function isStockAvailable(variantId: string, quantity: number, tx?: any): Promise<boolean> {
  if (quantity <= 0) return true;
  const available = await getAvailableStock(variantId, tx);
  return available >= quantity;
}

/**
 * Creates a transient stock reservation for a variant.
 * Wraps check-and-insert in a transaction to ensure atomicity.
 * 
 * @param cartId The shopping cart ID.
 * @param variantId The variant ID.
 * @param quantity The quantity to reserve.
 * @param ttlMinutes Duration of hold in minutes (default: 15).
 * @param tx Optional transaction client.
 * @returns The reservation ID.
 */
export async function createReservation(
  cartId: string,
  variantId: string,
  quantity: number,
  ttlMinutes: number = 15,
  tx?: any
): Promise<string> {
  if (quantity <= 0) {
    throw new Error("Reservation quantity must be greater than zero");
  }

  const execute = async (client: any) => {
    // 1. Get physical inventory item details
    const item = await client.query.inventoryItems.findFirst({
      where: eq(inventoryItems.variantId, variantId),
    });

    if (!item) {
      throw new Error(`Inventory item not found for variant ID: ${variantId}`);
    }

    // 2. Fetch and sum active reservations
    const activeReservations = await client.query.inventoryReservations.findMany({
      where: and(
        eq(inventoryReservations.inventoryItemId, item.id),
        gt(inventoryReservations.expiresAt, new Date())
      ),
    });

    const reservedSum = activeReservations.reduce((sum: number, res: any) => sum + res.quantity, 0);
    const availableStock = Math.max(0, item.stockLevel - reservedSum);

    if (availableStock < quantity) {
      throw new Error(`Insufficient stock for variant ID: ${variantId}. Available: ${availableStock}, Requested: ${quantity}`);
    }

    // 3. Insert new reservation hold
    const reservationId = `res_${nanoid(10)}`;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await client.insert(inventoryReservations).values({
      id: reservationId,
      inventoryItemId: item.id,
      cartId,
      quantity,
      expiresAt,
    });

    return reservationId;
  };

  if (tx) {
    return execute(tx);
  } else {
    return db.transaction(async (innerTx) => {
      return execute(innerTx);
    });
  }
}

/**
 * Creates transient stock reservations for multiple variants atomically.
 * If any single variant fails availability checks, the entire operation is rolled back.
 * 
 * @param cartId The shopping cart ID.
 * @param items Array of variant items and quantities to reserve.
 * @param ttlMinutes Duration of hold in minutes (default: 15).
 * @param tx Optional transaction client.
 * @returns Array of generated reservation IDs.
 */
export async function createReservationsBulk(
  cartId: string,
  items: { variantId: string; quantity: number }[],
  ttlMinutes: number = 15,
  tx?: any
): Promise<string[]> {
  if (items.length === 0) return [];

  const execute = async (client: any) => {
    const reservationIds: string[] = [];

    for (const item of items) {
      if (item.quantity <= 0) continue;
      
      const reservationId = await createReservation(
        cartId,
        item.variantId,
        item.quantity,
        ttlMinutes,
        client
      );
      reservationIds.push(reservationId);
    }

    return reservationIds;
  };

  if (tx) {
    return execute(tx);
  } else {
    return db.transaction(async (innerTx) => {
      return execute(innerTx);
    });
  }
}

/**
 * Manually releases (deletes) a reservation.
 * 
 * @param reservationId The reservation ID.
 * @param tx Optional transaction client.
 */
export async function releaseReservation(reservationId: string, tx?: any): Promise<void> {
  const client = tx || db;
  await client.delete(inventoryReservations).where(eq(inventoryReservations.id, reservationId));
}

/**
 * Releases all reservations associated with a shopping cart.
 * 
 * @param cartId The shopping cart ID.
 * @param tx Optional transaction client.
 */
export async function releaseCartReservations(cartId: string, tx?: any): Promise<void> {
  const client = tx || db;
  await client.delete(inventoryReservations).where(eq(inventoryReservations.cartId, cartId));
}

/**
 * Deletes all expired reservations from the database.
 * 
 * @returns The number of cleaned up reservations.
 */
export async function cleanupExpiredReservations(): Promise<number> {
  const result = await db
    .delete(inventoryReservations)
    .where(lt(inventoryReservations.expiresAt, new Date()))
    .returning();

  return result.length;
}

/**
 * Retrieves a filtered and searched list of inventory items joined with variants and products.
 * Includes calculated available stock levels and low-stock statuses.
 */
export async function getInventoryItems(params: { q?: string; status?: string } = {}) {
  const { q, status: statusFilter } = params;

  // Subquery to calculate active reservation sums grouped by inventory item ID
  const activeReservationsSubquery = db
    .select({
      inventoryItemId: inventoryReservations.inventoryItemId,
      reservedQuantity: sql<number>`SUM(${inventoryReservations.quantity})`.as("reserved_quantity"),
    })
    .from(inventoryReservations)
    .where(gt(inventoryReservations.expiresAt, new Date()))
    .groupBy(inventoryReservations.inventoryItemId)
    .as("active_res");

  // Core select query
  const queryBuilder = db
    .select({
      id: inventoryItems.id,
      variantId: inventoryItems.variantId,
      stockLevel: inventoryItems.stockLevel,
      lowStockThreshold: inventoryItems.lowStockThreshold,
      updatedAt: inventoryItems.updatedAt,
      sku: productVariants.sku,
      variantName: productVariants.name,
      barcode: productVariants.barcode,
      productName: products.name,
      productSlug: products.slug,
      productId: products.id,
      reservedQuantity: sql<number>`COALESCE(${activeReservationsSubquery.reservedQuantity}, 0)`.mapWith(Number),
    })
    .from(inventoryItems)
    .innerJoin(productVariants, eq(inventoryItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(activeReservationsSubquery, eq(inventoryItems.id, activeReservationsSubquery.inventoryItemId));

  // If search query is provided
  if (q && q.trim() !== "") {
    const searchVal = `%${q.trim()}%`;
    queryBuilder.where(
      or(
        like(products.name, searchVal),
        like(productVariants.sku, searchVal),
        like(productVariants.barcode, searchVal)
      )
    );
  }

  const results = await queryBuilder;

  // Map and calculate statuses in memory
  const mapped = results.map((row) => {
    const availableStock = Math.max(0, row.stockLevel - row.reservedQuantity);
    let status: "in-stock" | "low-stock" | "out-of-stock" = "in-stock";
    if (availableStock === 0) {
      status = "out-of-stock";
    } else if (availableStock <= row.lowStockThreshold) {
      status = "low-stock";
    }
    return {
      ...row,
      availableStock,
      status,
    };
  });

  // Apply status filter if present and not "all"
  if (statusFilter && statusFilter !== "all") {
    return mapped.filter((item) => item.status === statusFilter);
  }

  return mapped;
}

/**
 * Adjusts the physical stock level of an inventory item and logs the transaction.
 * Runs atomically inside a database transaction.
 */
export async function adjustStock(
  params: {
    inventoryItemId: string;
    type: "inbound" | "outbound" | "adjustment";
    quantity: number;
    reference?: string | null;
  },
  tx?: any
) {
  const execute = async (client: any) => {
    // 1. Fetch item
    const item = await client.query.inventoryItems.findFirst({
      where: eq(inventoryItems.id, params.inventoryItemId),
    });

    if (!item) {
      throw new Error(`Inventory item not found for ID: ${params.inventoryItemId}`);
    }

    // 2. Calculate new stock level
    let newStockLevel = item.stockLevel;
    if (params.type === "inbound") {
      if (params.quantity < 0) throw new Error("Inbound quantity must be positive");
      newStockLevel += params.quantity;
    } else if (params.type === "outbound") {
      if (params.quantity < 0) throw new Error("Outbound quantity must be positive");
      newStockLevel = Math.max(0, newStockLevel - params.quantity);
    } else if (params.type === "adjustment") {
      newStockLevel = Math.max(0, newStockLevel + params.quantity);
    }

    const now = new Date();

    // 3. Update stock level
    await client
      .update(inventoryItems)
      .set({
        stockLevel: newStockLevel,
        updatedAt: now,
      })
      .where(eq(inventoryItems.id, item.id));

    // 4. Log transaction
    const txId = `it_${nanoid(12)}`;
    await client.insert(inventoryTransactions).values({
      id: txId,
      inventoryItemId: item.id,
      type: params.type,
      quantity: params.quantity,
      reference: params.reference || "manual adjustment",
      createdAt: now,
    });

    return {
      success: true,
      inventoryItemId: item.id,
      oldStockLevel: item.stockLevel,
      newStockLevel,
    };
  };

  if (tx) {
    return execute(tx);
  } else {
    return db.transaction(async (innerTx) => {
      return execute(innerTx);
    });
  }
}

/**
 * Updates the low stock threshold alert level for a given inventory item.
 */
export async function updateLowStockThreshold(
  inventoryItemId: string,
  threshold: number,
  tx?: any
) {
  const client = tx || db;
  await client
    .update(inventoryItems)
    .set({
      lowStockThreshold: threshold,
      updatedAt: new Date(),
    })
    .where(eq(inventoryItems.id, inventoryItemId));
  return { success: true };
}

/**
 * Retrieves a detailed list of recent inventory transaction logs.
 */
export async function getInventoryTransactions(params: { limit?: number } = {}) {
  const limit = params.limit || 50;

  return db
    .select({
      id: inventoryTransactions.id,
      inventoryItemId: inventoryTransactions.inventoryItemId,
      type: inventoryTransactions.type,
      quantity: inventoryTransactions.quantity,
      reference: inventoryTransactions.reference,
      createdAt: inventoryTransactions.createdAt,
      sku: productVariants.sku,
      variantName: productVariants.name,
      productName: products.name,
    })
    .from(inventoryTransactions)
    .innerJoin(inventoryItems, eq(inventoryTransactions.inventoryItemId, inventoryItems.id))
    .innerJoin(productVariants, eq(inventoryItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .orderBy(desc(inventoryTransactions.createdAt))
    .limit(limit);
}

