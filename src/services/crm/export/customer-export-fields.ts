import { CustomerExportField } from "./customer-export.types";

export const EXPORT_FIELD_REGISTRY: CustomerExportField[] = [
  // Profile
  { key: "customerId", label: "Customer ID", group: "Profile", enabledByDefault: true },
  { key: "name", label: "Name", group: "Profile", enabledByDefault: true },
  { key: "email", label: "Email", group: "Profile", enabledByDefault: true },
  { key: "phoneNumber", label: "Phone", group: "Profile", enabledByDefault: true },
  { key: "whatsappNumber", label: "WhatsApp", group: "Profile" },
  { key: "accountStatus", label: "Account Status", group: "Profile", enabledByDefault: true },
  { key: "createdAt", label: "Created At", group: "Profile" },
  { key: "updatedAt", label: "Updated At", group: "Profile" },
  { key: "lastLoginAt", label: "Last Login", group: "Profile" },

  // Orders & Revenue
  { key: "totalOrders", label: "Total Orders", group: "Orders & Revenue", enabledByDefault: true },
  { key: "completedOrders", label: "Completed Orders", group: "Orders & Revenue" },
  { key: "cancelledOrders", label: "Cancelled Orders", group: "Orders & Revenue" },
  { key: "lifetimeValue", label: "Lifetime Value", group: "Orders & Revenue", enabledByDefault: true },
  { key: "averageOrderValue", label: "Average Order Value", group: "Orders & Revenue" },
  { key: "firstOrderDate", label: "First Order Date", group: "Orders & Revenue" },
  { key: "lastOrderDate", label: "Last Order Date", group: "Orders & Revenue" },

  // Engagement
  { key: "wishlistCount", label: "Wishlist Count", group: "Engagement" },
  { key: "recentlyViewedCount", label: "Recently Viewed Count", group: "Engagement" },
  { key: "searchCount", label: "Search Count", group: "Engagement" },
  { key: "favoriteCategory", label: "Favorite Category", group: "Engagement" },
  { key: "favoriteCollection", label: "Favorite Collection", group: "Engagement" },
  { key: "favoriteShape", label: "Favorite Shape", group: "Engagement" },
  { key: "favoriteLength", label: "Favorite Length", group: "Engagement" },

  // Marketing
  { key: "marketingConsent", label: "Marketing Consent", group: "Marketing" },
  { key: "customerTags", label: "Customer Tags", group: "Marketing" },
  { key: "couponsUsed", label: "Coupons Used", group: "Marketing" },
  { key: "launchSubscriptions", label: "Launch Subscriptions", group: "Marketing" }
];

export const EXPORT_FIELD_MAP = new Map<string, CustomerExportField>(
  EXPORT_FIELD_REGISTRY.map(f => [f.key, f])
);
