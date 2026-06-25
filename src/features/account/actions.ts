"use server";

import { db } from "@/db";
import { 
  orders, 
  orderItems, 
  orderAddresses, 
  userAddresses, 
  productVariants, 
  products, 
  wishlists,
  wishlistItems,
  reviews
} from "@/db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  if (!token) return null;
  return getSessionUser(token);
}

export async function getDashboardData() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Get total orders count
    const ordersCountResult = await db
      .select({ val: count(orders.id) })
      .from(orders)
      .where(eq(orders.userId, user.id));
    const totalOrders = ordersCountResult[0]?.val || 0;

    // 2. Get default shipping address
    const defaultAddress = await db.query.userAddresses.findFirst({
      where: and(
        eq(userAddresses.userId, user.id),
        eq(userAddresses.type, "shipping"),
        eq(userAddresses.isDefault, true)
      ),
    }) || await db.query.userAddresses.findFirst({
      where: and(
        eq(userAddresses.userId, user.id),
        eq(userAddresses.type, "shipping")
      ),
    });

    // 3. Get recent orders (last 3) with items, variant, product, and media details
    const recentOrders = await db.query.orders.findMany({
      where: eq(orders.userId, user.id),
      orderBy: [desc(orders.createdAt)],
      limit: 3,
      with: {
        items: {
          with: {
            variant: {
              with: {
                product: {
                  with: {
                    media: {
                      with: {
                        media: true,
                      },
                      orderBy: (pm, { asc }) => [asc(pm.sortOrder)],
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // 4. Get Wishlist count and items preview (last 3 items)
    const userWishlist = await db.query.wishlists.findFirst({
      where: eq(wishlists.userId, user.id),
      with: {
        items: true,
      },
    });

    let wishlistCount = 0;
    let wishlistProducts: any[] = [];

    if (userWishlist && userWishlist.items.length > 0) {
      wishlistCount = userWishlist.items.length;
      const productIds = userWishlist.items.map((item) => item.productId).slice(0, 3);

      const dbProducts = await db.query.products.findMany({
        where: sql`${products.id} in (${sql.join(productIds.map(id => sql`${id}`), sql`, `)})`,
        with: {
          variants: true,
          media: {
            with: {
              media: true,
            },
            orderBy: (pm, { asc }) => [asc(pm.sortOrder)],
          },
        },
      });

      // Get reviews averages
      const reviewsData = await db
        .select({
          productId: reviews.productId,
          avgRating: sql<number>`avg(${reviews.rating})`,
        })
        .from(reviews)
        .where(eq(reviews.isApproved, true))
        .groupBy(reviews.productId);

      const reviewsMap = new Map(reviewsData.map((r) => [r.productId, r]));

      wishlistProducts = dbProducts.map((p) => {
        const prices = p.variants?.map((v) => (v as any).price) || [];
        const priceMin = prices.length > 0 ? Math.min(...prices) : 99900; // fallback default
        
        const reviewStats = reviewsMap.get(p.id);
        const rating = reviewStats ? Number(reviewStats.avgRating) : 4.8;

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          priceMin,
          rating,
          media: p.media,
        };
      });
    }

    return {
      success: true,
      data: {
        totalOrders,
        defaultAddress,
        recentOrders,
        wishlistCount,
        wishlistProducts,
      },
    };
  } catch (error: any) {
    console.error("Failed to load dashboard data:", error);
    return { success: false, error: error.message || "Failed to load dashboard data" };
  }
}

export async function generateDemoOrder() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Fetch some catalog variants for the items
    const variants = await db.query.productVariants.findMany({
      limit: 2,
      with: {
        product: true,
      },
    });

    if (variants.length === 0) {
      return { 
        success: false, 
        error: "No products found in the database. Please seed products first using `npm run db:seed`." 
      };
    }

    // 2. Construct order details
    const orderId = `ord_${nanoid(10)}`;
    const now = new Date();

    // Summing items
    const selectedVariant = variants[0];
    const secondVariant = variants[1] || variants[0];
    
    const itemsData = [
      {
        id: `oi_${nanoid(10)}`,
        orderId,
        variantId: selectedVariant.id,
        quantity: 1,
        price: selectedVariant.price,
        discount: 0,
      }
    ];

    if (variants.length > 1) {
      itemsData.push({
        id: `oi_${nanoid(10)}`,
        orderId,
        variantId: secondVariant.id,
        quantity: 2,
        price: secondVariant.price,
        discount: 10000, // ₹100 discount in paise
      });
    }

    const itemsSubtotal = itemsData.reduce((sum, item) => sum + (item.price - item.discount) * item.quantity, 0);
    const shippingAmount = 9900; // ₹99 in paise
    const taxAmount = Math.floor(itemsSubtotal * 0.18); // 18% GST
    const totalAmount = itemsSubtotal + shippingAmount + taxAmount;

    // 3. Insert order
    await db.insert(orders).values({
      id: orderId,
      userId: user.id,
      status: "processing",
      totalAmount,
      taxAmount,
      shippingAmount,
      discountAmount: 0,
      notes: "Demo test order created from customer account dashboard.",
      createdAt: now,
      updatedAt: now,
    });

    // 4. Insert order items
    for (const item of itemsData) {
      await db.insert(orderItems).values(item);
    }

    // 5. Insert order shipping address
    // Check if the user has a default address we can copy, otherwise use dummy address
    const defaultUserAddr = await db.query.userAddresses.findFirst({
      where: and(
        eq(userAddresses.userId, user.id),
        eq(userAddresses.type, "shipping")
      ),
    });

    await db.insert(orderAddresses).values({
      id: `oadr_${nanoid(10)}`,
      orderId,
      type: "shipping",
      name: defaultUserAddr?.name || user.name || "Jane Doe",
      phone: defaultUserAddr?.phone || user.phoneNumber,
      addressLine1: defaultUserAddr?.addressLine1 || "Apartment 4B, Emerald Heights",
      addressLine2: defaultUserAddr?.addressLine2 || "Goregaon East",
      city: defaultUserAddr?.city || "Mumbai",
      state: defaultUserAddr?.state || "Maharashtra",
      postalCode: defaultUserAddr?.postalCode || "400063",
      country: defaultUserAddr?.country || "India",
      createdAt: now,
      updatedAt: now,
    });

    revalidatePath("/account");
    return { success: true, orderId };
  } catch (error: any) {
    console.error("Failed to generate demo order:", error);
    return { success: false, error: error.message || "Failed to generate demo order" };
  }
}

export async function getUserAddresses() {
  try {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const addresses = await db.query.userAddresses.findMany({
      where: eq(userAddresses.userId, user.id),
      orderBy: [desc(userAddresses.isDefault), desc(userAddresses.createdAt)],
    });

    return { success: true, addresses };
  } catch (error: any) {
    console.error("Failed to fetch user addresses:", error);
    return { success: false, error: error.message || "Failed to fetch user addresses" };
  }
}

export async function saveUserAddress(data: {
  id?: string;
  type: "shipping" | "billing";
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}) {
  try {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const now = new Date();

    // If setting as default, clear default status for other addresses of this type
    if (data.isDefault) {
      await db
        .update(userAddresses)
        .set({ isDefault: false, updatedAt: now })
        .where(
          and(
            eq(userAddresses.userId, user.id),
            eq(userAddresses.type, data.type)
          )
        );
    }

    if (data.id) {
      // Security Check: Make sure the address belongs to the user
      const existing = await db.query.userAddresses.findFirst({
        where: and(
          eq(userAddresses.id, data.id),
          eq(userAddresses.userId, user.id)
        ),
      });

      if (!existing) {
        return { success: false, error: "Address not found or unauthorized access." };
      }

      // Update address
      await db
        .update(userAddresses)
        .set({
          type: data.type,
          name: data.name,
          phone: data.phone,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2 || null,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
          isDefault: data.isDefault,
          updatedAt: now,
        })
        .where(eq(userAddresses.id, data.id));
    } else {
      // Enforce limit of 5 saved addresses
      const userAddressesCount = await db
        .select({ val: count(userAddresses.id) })
        .from(userAddresses)
        .where(eq(userAddresses.userId, user.id));

      const addressCount = userAddressesCount[0]?.val || 0;
      if (addressCount >= 5) {
        return {
          success: false,
          error: "You have reached the maximum limit of 5 saved addresses. Please delete an existing address to add a new one.",
        };
      }

      // Insert new address
      const addressId = `addr_${nanoid(10)}`;
      await db.insert(userAddresses).values({
        id: addressId,
        userId: user.id,
        type: data.type,
        name: data.name,
        phone: data.phone,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 || null,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        isDefault: data.isDefault,
        createdAt: now,
        updatedAt: now,
      });
    }

    revalidatePath("/account/addresses");
    revalidatePath("/account");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to save address:", error);
    return { success: false, error: error.message || "Failed to save address" };
  }
}

export async function deleteUserAddress(addressId: string) {
  try {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Security check: Verify the user owns this address
    const existing = await db.query.userAddresses.findFirst({
      where: and(
        eq(userAddresses.id, addressId),
        eq(userAddresses.userId, user.id)
      ),
    });

    if (!existing) {
      return { success: false, error: "Address not found or unauthorized access." };
    }

    // Delete the address
    await db.delete(userAddresses).where(eq(userAddresses.id, addressId));

    // If the deleted address was default, promote the first remaining address to default
    if (existing.isDefault) {
      const firstRemaining = await db.query.userAddresses.findFirst({
        where: and(
          eq(userAddresses.userId, user.id),
          eq(userAddresses.type, existing.type)
        ),
        orderBy: [desc(userAddresses.createdAt)],
      });

      if (firstRemaining) {
        await db
          .update(userAddresses)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(eq(userAddresses.id, firstRemaining.id));
      }
    }

    revalidatePath("/account/addresses");
    revalidatePath("/account");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete address:", error);
    return { success: false, error: error.message || "Failed to delete address" };
  }
}

export async function setDefaultAddress(addressId: string, type: "shipping" | "billing") {
  try {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Security check
    const existing = await db.query.userAddresses.findFirst({
      where: and(
        eq(userAddresses.id, addressId),
        eq(userAddresses.userId, user.id)
      ),
    });

    if (!existing) {
      return { success: false, error: "Address not found or unauthorized access." };
    }

    const now = new Date();

    // Clear other defaults
    await db
      .update(userAddresses)
      .set({ isDefault: false, updatedAt: now })
      .where(
        and(
          eq(userAddresses.userId, user.id),
          eq(userAddresses.type, type)
        )
      );

    // Set this one as default
    await db
      .update(userAddresses)
      .set({ isDefault: true, updatedAt: now })
      .where(eq(userAddresses.id, addressId));

    revalidatePath("/account/addresses");
    revalidatePath("/account");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to set default address:", error);
    return { success: false, error: error.message || "Failed to set default address" };
  }
}

