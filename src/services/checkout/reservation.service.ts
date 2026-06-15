import { releaseCartReservations, createReservationsBulk } from "../inventory/inventory.service";

/**
 * Recycles stock reservations for a cart. 
 * Releasing previous reservations first ensures fresh stock checks and restarts the 15-minute TTL hold.
 * 
 * @param cartId The shopping cart ID.
 * @param items Array of variant items and quantities to reserve.
 * @param tx Optional transaction client.
 * @returns Array of generated reservation IDs.
 */
export async function reserveStockForCart(
  cartId: string,
  items: { variantId: string; quantity: number }[],
  tx?: any
): Promise<string[]> {
  // 1. Release any existing reservations linked to this cart to clear out stale holds
  await releaseCartReservations(cartId, tx);

  // 2. Request new reservations atomically
  return createReservationsBulk(cartId, items, 15, tx);
}

/**
 * Releases all reservations associated with a cart.
 * 
 * @param cartId The shopping cart ID.
 * @param tx Optional transaction client.
 */
export async function releaseStockForCart(cartId: string, tx?: any): Promise<void> {
  await releaseCartReservations(cartId, tx);
}
