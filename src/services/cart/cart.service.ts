import { db } from "@/db";
import { carts, cartItems, inventoryItems, inventoryReservations } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Retrieves a customer cart by their internal user ID, including its line items and product variant details.
 * 
 * @param userId The customer's internal user ID.
 * @param tx Optional transaction client.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCartByUserId(userId: string, tx?: any) {
  const client = tx || db;
  return client.query.carts.findFirst({
    where: eq(carts.userId, userId),
    with: {
      items: {
        with: {
          variant: true,
        },
      },
    },
  });
}

/**
 * Retrieves a guest cart by their guest cart cookie token, including its line items and product variant details.
 * 
 * @param guestCartToken The guest cart token.
 * @param tx Optional transaction client.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCartByGuestToken(guestCartToken: string, tx?: any) {
  const client = tx || db;
  return client.query.carts.findFirst({
    where: eq(carts.guestCartToken, guestCartToken),
    with: {
      items: {
        with: {
          variant: true,
        },
      },
    },
  });
}

/**
 * Creates a new shopping cart.
 * 
 * @param userId The internal user ID (null for guests).
 * @param guestCartToken The guest cart token (null for logged-in customers).
 * @param tx Optional transaction client.
 */
export async function createCart(
  userId: string | null,
  guestCartToken: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any
) {
  const client = tx || db;
  const cartId = `crt_${nanoid(10)}`;
  const now = new Date();

  const newCarts = await client
    .insert(carts)
    .values({
      id: cartId,
      userId,
      guestCartToken,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return newCarts[0];
}

/**
 * Merges a guest cart into a customer's permanent database cart.
 * Wraps the entire operation in a database transaction to guarantee consistency.
 * 
 * - If no guest cart is found for the token, it's a no-op.
 * - If the customer has no existing cart, the guest cart is reassigned directly to the customer.
 * - If the customer has an existing cart, duplicate items are combined up to their variant's physical stock level.
 * - Guest cart's active inventory reservations are moved to the customer cart.
 * - Finally, the guest cart is deleted (cascading deletes to its cart items).
 * 
 * @param guestCartToken The guest cart token.
 * @param userId The customer's internal user ID.
 * @param tx Optional transaction client.
 */
export async function mergeGuestCartIntoCustomerCart(
  guestCartToken: string,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const execute = async (client: any) => {
    // 1. Retrieve the guest cart with its items
    const guestCart = await client.query.carts.findFirst({
      where: eq(carts.guestCartToken, guestCartToken),
      with: {
        items: true,
      },
    });

    if (!guestCart) {
      return; // Guest cart doesn't exist, nothing to merge
    }

    // If guest cart is empty, delete it and return
    if (guestCart.items.length === 0) {
      await client.delete(carts).where(eq(carts.id, guestCart.id));
      return;
    }

    // 2. Retrieve the customer's permanent cart
    const customerCart = await client.query.carts.findFirst({
      where: eq(carts.userId, userId),
      with: {
        items: true,
      },
    });

    const now = new Date();

    // 3. Scenario A: Customer does not have an existing cart
    // Simply reassign the guest cart to this customer and clear the guest token
    if (!customerCart) {
      await client
        .update(carts)
        .set({
          userId,
          guestCartToken: null,
          updatedAt: now,
        })
        .where(eq(carts.id, guestCart.id));
      return;
    }

    // 4. Scenario B: Customer already has a permanent cart
    // Merge the items from the guest cart into the customer's cart
    const guestItems = guestCart.items;
    const customerItems = customerCart.items;

    // Fetch physical stock levels for the variant items in the guest cart to respect stock limits
    const variantIds = guestItems.map((item: any) => item.variantId);
    
    const inventoryMap = new Map<string, number>();
    if (variantIds.length > 0) {
      const inventoryList = await client.query.inventoryItems.findMany({
        where: inArray(inventoryItems.variantId, variantIds),
      });
      for (const inv of inventoryList) {
        inventoryMap.set(inv.variantId, inv.stockLevel);
      }
    }

    for (const guestItem of guestItems) {
      const customerItem = customerItems.find(
        (item: any) => item.variantId === guestItem.variantId
      );
      const stockLevel = inventoryMap.get(guestItem.variantId) ?? 0;

      if (customerItem) {
        // Combined quantity clamped to the physical stock limit
        const newQuantity = Math.min(
          customerItem.quantity + guestItem.quantity,
          stockLevel
        );

        if (newQuantity > 0) {
          await client
            .update(cartItems)
            .set({ quantity: newQuantity })
            .where(
              and(
                eq(cartItems.cartId, customerCart.id),
                eq(cartItems.variantId, guestItem.variantId)
              )
            );
        } else {
          // If stock level is 0, remove the item
          await client
            .delete(cartItems)
            .where(
              and(
                eq(cartItems.cartId, customerCart.id),
                eq(cartItems.variantId, guestItem.variantId)
              )
            );
        }
      } else {
        // Variant is new to customer cart, insert clamped to stock level
        const newQuantity = Math.min(guestItem.quantity, stockLevel);
        if (newQuantity > 0) {
          await client.insert(cartItems).values({
            cartId: customerCart.id,
            variantId: guestItem.variantId,
            quantity: newQuantity,
          });
        }
      }
    }

    // 5. Transfer all active inventory reservations from the guest cart to the customer cart
    await client
      .update(inventoryReservations)
      .set({ cartId: customerCart.id })
      .where(eq(inventoryReservations.cartId, guestCart.id));

    // 6. Delete the guest cart (which cascades to delete its guest cart_items)
    await client.delete(carts).where(eq(carts.id, guestCart.id));
  };

  if (tx) {
    await execute(tx);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.transaction(async (innerTx: any) => {
      await execute(innerTx);
    });
  }
}
