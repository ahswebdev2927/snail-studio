export interface CartItem {
  id: string;
  productId?: string;
  price: number; // in Rupees or paise
  quantity: number;
}

export interface BundleItem {
  productId: string;
}

export interface Bundle {
  id: string;
  name: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  items: BundleItem[];
}

/**
 * Calculates the total bundle discount for a list of cart items.
 * Returns the total discount in paise and details of applied bundles.
 */
export function calculateBundleDiscount(
  cartItems: CartItem[],
  activeBundles: any[]
): { totalDiscount: number; appliedBundles: { bundleId: string; count: number; name: string; discount: number }[] } {
  // Helper to normalize price to paise
  const getNormalizedPriceInPaise = (price: number) => {
    if (price < 10000) {
      return Math.round(price * 100);
    }
    return Math.round(price);
  };

  // Create a mutable copy of cart items to track remaining quantities
  const pool = cartItems
    .map((item) => ({
      productId: item.productId || "",
      priceInPaise: getNormalizedPriceInPaise(item.price),
      quantity: item.quantity,
    }))
    .filter((item) => item.productId !== "");

  let totalDiscount = 0;
  const appliedBundles: { bundleId: string; count: number; name: string; discount: number }[] = [];

  // Sort bundles by discount value descending (greedy approach)
  const sortedBundles = [...activeBundles].sort((a, b) => {
    const valA = a.discountType === "fixed" ? a.discountValue : a.discountValue * 100;
    const valB = b.discountType === "fixed" ? b.discountValue : b.discountValue * 100;
    return valB - valA;
  });

  for (const bundle of sortedBundles) {
    const bundleProductIds = bundle.items.map((item: any) => item.productId);
    if (bundleProductIds.length === 0) continue;

    // Check how many sets of this bundle we can make with the remaining items in pool
    let possibleSets = Infinity;
    for (const prodId of bundleProductIds) {
      const poolItems = pool.filter((item) => item.productId === prodId);
      const totalQty = poolItems.reduce((sum, item) => sum + item.quantity, 0);
      possibleSets = Math.min(possibleSets, totalQty);
    }

    if (possibleSets > 0 && possibleSets !== Infinity) {
      // Calculate discount for this bundle
      let bundleDiscountInPaise = 0;
      if (bundle.discountType === "percentage") {
        // Calculate the base price of one set of the bundle
        let setBasePriceInPaise = 0;
        for (const prodId of bundleProductIds) {
          const matchedItem = pool.find((item) => item.productId === prodId);
          if (matchedItem) {
            setBasePriceInPaise += matchedItem.priceInPaise;
          }
        }
        bundleDiscountInPaise = Math.round((setBasePriceInPaise * bundle.discountValue) / 100) * possibleSets;
      } else {
        // Fixed discount: Value is already in paise
        bundleDiscountInPaise = bundle.discountValue * possibleSets;
      }

      // Deduct quantities from pool
      for (const prodId of bundleProductIds) {
        let needed = possibleSets;
        for (const item of pool) {
          if (item.productId === prodId && item.quantity > 0) {
            const take = Math.min(item.quantity, needed);
            item.quantity -= take;
            needed -= take;
            if (needed <= 0) break;
          }
        }
      }

      totalDiscount += bundleDiscountInPaise;
      appliedBundles.push({
        bundleId: bundle.id,
        count: possibleSets,
        name: bundle.name,
        discount: bundleDiscountInPaise,
      });
    }
  }

  return { totalDiscount, appliedBundles };
}
