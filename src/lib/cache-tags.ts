export const CACHE_TAGS = {
  PRODUCTS: "products",
  CATEGORIES: "categories",
  COLLECTIONS: "collections",
  DASHBOARD: "dashboard",
  ANALYTICS: "analytics",
  ORDERS: "orders",
  INVENTORY: "inventory",
  SETTINGS: "settings",
  NAVIGATION: "navigation",
} as const;

export type CacheTag = typeof CACHE_TAGS[keyof typeof CACHE_TAGS];
