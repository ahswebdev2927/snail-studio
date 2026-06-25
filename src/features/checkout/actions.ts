"use server";

import { db } from "@/db";
import { carts, cartItems, userAddresses, systemSettings, productVariants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";
import { processCheckout } from "@/services/checkout/checkout.service";

/**
 * Helper to get the current authenticated session user from cookies
 */
async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  if (!token) return null;
  return getSessionUser(token);
}

/**
 * Retrieves the currently authenticated customer profile and any saved addresses.
 */
export async function getCheckoutCustomer() {
  try {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const savedAddresses = await db.query.userAddresses.findMany({
      where: eq(userAddresses.userId, user.id),
    });

    return { success: true, user, savedAddresses };
  } catch (error: any) {
    console.error("Error in getCheckoutCustomer server action:", error);
    return { success: false, error: error.message || "Failed to retrieve customer session" };
  }
}

/**
 * Synchronizes client-side local cart items into the database to generate a valid DB cart ID.
 */
export async function syncCartToDb(items: { variantId: string; quantity: number }[]) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: "Authentication is required to proceed with checkout." };
    }

    // Get or create customer cart in the database
    let cart = await db.query.carts.findFirst({
      where: eq(carts.userId, user.id),
    });

    if (!cart) {
      const cartId = `crt_${nanoid(10)}`;
      const insertedCarts = await db
        .insert(carts)
        .values({
          id: cartId,
          userId: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      cart = insertedCarts[0];
    }

    // Clear old cart items and insert the current ones
    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));

    if (items.length > 0) {
      for (const item of items) {
        let resolvedVariantId = item.variantId;

        // If the ID represents a product instead of a variant, resolve it to its first active variant
        if (item.variantId.startsWith("prod_")) {
          const firstVariant = await db.query.productVariants.findFirst({
            where: eq(productVariants.productId, item.variantId),
          });
          if (!firstVariant) {
            throw new Error(`Product variant not found for product ID: ${item.variantId}`);
          }
          resolvedVariantId = firstVariant.id;
        }

        await db.insert(cartItems).values({
          cartId: cart.id,
          variantId: resolvedVariantId,
          quantity: item.quantity,
        });
      }
    }

    return { success: true, cartId: cart.id };
  } catch (error: any) {
    console.error("Error in syncCartToDb server action:", error);
    return { success: false, error: error.message || "Failed to synchronize cart with the database." };
  }
}

/**
 * Fetches dynamic shipping configurations from the database (in Rupees).
 */
export async function getShippingRules() {
  try {
    const settings = await db.select().from(systemSettings);
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    const standardFee = Number(settingsMap.get("shipping_standard_fee") ?? "99");
    const freeThreshold = Number(settingsMap.get("shipping_free_threshold") ?? "1500");
    const expressFee = Number(settingsMap.get("shipping_express_fee") ?? "250");

    return {
      success: true,
      standardFee,
      freeThreshold,
      expressFee,
    };
  } catch (error: any) {
    console.error("Error in getShippingRules server action:", error);
    return {
      success: false,
      standardFee: 99,
      freeThreshold: 1500,
      expressFee: 250,
    };
  }
}

/**
 * Completes stock reservation and order generation, returning a gateway payment session.
 */
export async function createCheckoutOrder(params: {
  cartId: string;
  shippingAddress: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  notes?: string;
  couponCode?: string;
  discountAmount?: number;
  shippingAmount?: number;
}) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: "Session expired. Please log in again." };
    }

    const result = await processCheckout(params);
    return { success: true, result };
  } catch (error: any) {
    console.error("Error in createCheckoutOrder server action:", error);
    return { success: false, error: error.message || "Failed to initiate checkout order." };
  }
}
