/**
 * Google Analytics 4 (GA4) Client-Side Tracking Utilities
 * 
 * Provides type-safe wrappers around window.gtag for standard events 
 * and Enhanced Ecommerce measurement. Safe for use in both SSR and Client components.
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Define window.gtag type if not already defined globally
declare global {
  interface Window {
    gtag?: (
      command: "event" | "config" | "set",
      targetId: string,
      config?: Record<string, any>
    ) => void;
  }
}

export interface GA4Item {
  item_id: string;
  item_name: string;
  affiliation?: string;
  coupon?: string;
  discount?: number;
  index?: number;
  item_brand?: string;
  item_category?: string;
  item_category2?: string;
  item_category3?: string;
  item_category4?: string;
  item_category5?: string;
  item_list_id?: string;
  item_list_name?: string;
  item_variant?: string;
  location_id?: string;
  price?: number;
  quantity?: number;
}

/**
 * Send a page_view event to Google Analytics
 */
export const pageview = (url: string) => {
  if (typeof window !== "undefined" && window.gtag && GA_MEASUREMENT_ID) {
    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
};

/**
 * Log a generic custom event to Google Analytics
 */
export const event = (action: string, params: Record<string, any> = {}) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", action, params);
  }
};

/**
 * ENHANCED ECOMMERCE EVENTS
 */

/**
 * Track when a user views a product's details
 * Event name: view_item
 */
export const trackViewItem = (item: GA4Item, value?: number, currency = "INR") => {
  event("view_item", {
    currency,
    value: value ?? (item.price ? item.price * (item.quantity || 1) : 0),
    items: [item],
  });
};

/**
 * Track when items are added to the cart
 * Event name: add_to_cart
 */
export const trackAddToCart = (items: GA4Item | GA4Item[], value?: number, currency = "INR") => {
  const itemsArray = Array.isArray(items) ? items : [items];
  const totalValue = value ?? itemsArray.reduce((acc, curr) => acc + (curr.price || 0) * (curr.quantity || 1), 0);
  
  event("add_to_cart", {
    currency,
    value: totalValue,
    items: itemsArray,
  });
};

/**
 * Track when items are removed from the cart
 * Event name: remove_from_cart
 */
export const trackRemoveFromCart = (items: GA4Item | GA4Item[], value?: number, currency = "INR") => {
  const itemsArray = Array.isArray(items) ? items : [items];
  const totalValue = value ?? itemsArray.reduce((acc, curr) => acc + (curr.price || 0) * (curr.quantity || 1), 0);
  
  event("remove_from_cart", {
    currency,
    value: totalValue,
    items: itemsArray,
  });
};

/**
 * Track when a user initiates the checkout process
 * Event name: begin_checkout
 */
export const trackBeginCheckout = (items: GA4Item[], value?: number, coupon?: string, currency = "INR") => {
  const totalValue = value ?? items.reduce((acc, curr) => acc + (curr.price || 0) * (curr.quantity || 1), 0);
  
  event("begin_checkout", {
    currency,
    value: totalValue,
    coupon,
    items,
  });
};

/**
 * Track when a transaction/purchase is completed
 * Event name: purchase
 */
export const trackPurchase = (
  transactionId: string,
  value: number,
  items: GA4Item[],
  tax = 0,
  shipping = 0,
  coupon?: string,
  currency = "INR"
) => {
  event("purchase", {
    transaction_id: transactionId,
    value,
    tax,
    shipping,
    coupon,
    currency,
    items,
  });
};

/**
 * Track when an item is added to the wishlist
 * Event name: add_to_wishlist
 */
export const trackAddToWishlist = (item: GA4Item, value?: number, currency = "INR") => {
  event("add_to_wishlist", {
    currency,
    value: value ?? (item.price ? item.price * (item.quantity || 1) : 0),
    items: [item],
  });
};

/**
 * Track when a search is performed
 * Event name: search
 */
export const trackSearch = (searchTerm: string) => {
  event("search", {
    search_term: searchTerm,
  });
};

/**
 * Track when a user views a list of items (e.g. Category list, Collection list, or Search results list)
 * Event name: view_item_list
 */
export const trackViewItemList = (listName: string, items: GA4Item[]) => {
  event("view_item_list", {
    item_list_name: listName,
    items: items,
  });
};

/**
 * Track when a user applies a promotional coupon code during checkout
 * Event name: apply_coupon
 */
export const trackApplyCoupon = (couponCode: string) => {
  event("apply_coupon", {
    coupon_code: couponCode,
  });
};
