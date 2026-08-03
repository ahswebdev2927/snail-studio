import { z } from "zod";
import { sanitizedStringSchema, sanitizedHtmlSchema } from "./sanitize";

// ==========================================
// 1. PRODUCT & VARIANT SCHEMAS
// ==========================================

export const variantSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: sanitizedStringSchema.pipe(z.string().min(1, "Variant name is required")),
  price: z.number().int().min(0, "Price must be a positive integer"),
  compareAtPrice: z.number().int().min(0).optional().nullable(),
  barcode: z.string().optional().nullable(),
  stock: z.number().int().min(0, "Stock cannot be negative").default(0),
  lowStockThreshold: z.number().int().min(0, "Low stock threshold cannot be negative").default(5),
  attributeValueIds: z.array(z.string()).default([]),
}).refine(
  (data) => {
    if (data.compareAtPrice !== undefined && data.compareAtPrice !== null) {
      return data.compareAtPrice >= data.price;
    }
    return true;
  },
  {
    message: "Compare-at price must be greater than or equal to the standard price",
    path: ["compareAtPrice"],
  }
);

export const createProductSchema = z.object({
  name: sanitizedStringSchema.pipe(z.string().min(1, "Name is required").max(150, "Name is too long")),
  slug: z.string().max(150, "Slug is too long").optional(),
  description: sanitizedHtmlSchema.optional().nullable(),
  shortDescription: sanitizedStringSchema.pipe(z.string().max(500, "Short description is too long")).optional().nullable(),
  brandId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  status: z
    .enum(["Active", "Draft", "Out Of Stock", "Archived", "Hidden", "Coming Soon", "Launching Soon"])
    .default("Draft"),
  launchDate: z.string().optional().nullable(),
  launchTime: z.string().optional().nullable(),
  launchTimeZone: z.string().default("Asia/Kolkata"),
  autoPublish: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  metaTitle: sanitizedStringSchema.pipe(z.string().max(100, "Meta title is too long")).optional().nullable(),
  metaDescription: sanitizedStringSchema.pipe(z.string().max(250, "Meta description is too long")).optional().nullable(),
  attributeValueIds: z.array(z.string()).default([]),
  media: z
    .array(
      z.object({
        mediaId: z.string(),
        isFeatured: z.boolean().default(false),
        sortOrder: z.number().default(0),
      })
    )
    .default([]),
  variants: z.array(variantSchema).min(1, "At least one variant is required"),
});

export const updateProductSchema = z.object({
  name: sanitizedStringSchema.pipe(z.string().min(1, "Name is required").max(150, "Name is too long")),
  slug: z.string().max(150, "Slug is too long").optional(),
  description: sanitizedHtmlSchema.optional().nullable(),
  shortDescription: sanitizedStringSchema.pipe(z.string().max(500, "Short description is too long")).optional().nullable(),
  brandId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  status: z.enum(["Active", "Draft", "Out Of Stock", "Archived", "Hidden", "Coming Soon", "Launching Soon"]),
  launchDate: z.string().optional().nullable(),
  launchTime: z.string().optional().nullable(),
  launchTimeZone: z.string().default("Asia/Kolkata"),
  autoPublish: z.boolean().default(false),
  isFeatured: z.boolean(),
  isBestSeller: z.boolean(),
  isNewArrival: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  metaTitle: sanitizedStringSchema.pipe(z.string().max(100, "Meta title is too long")).optional().nullable(),
  metaDescription: sanitizedStringSchema.pipe(z.string().max(250, "Meta description is too long")).optional().nullable(),
  ogImage: z.string().url("Invalid image URL").optional().nullable().or(z.literal("")),
  attributeValueIds: z.array(z.string()).default([]),
  media: z
    .array(
      z.object({
        mediaId: z.string(),
        isFeatured: z.boolean().default(false),
        sortOrder: z.number().default(0),
      })
    )
    .default([]),
});

// ==========================================
// 2. CATEGORY SCHEMAS
// ==========================================

export const createCategorySchema = z.object({
  name: sanitizedStringSchema.pipe(z.string().min(1, "Name is required").max(100, "Name is too long")),
  slug: z
    .string()
    .max(100, "Slug is too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional()
    .or(z.literal("")),
  parentId: z.string().max(100).optional().nullable(),
  description: sanitizedStringSchema.pipe(z.string().max(1000, "Description is too long")).optional().nullable(),
  image: z.string().url("Invalid image URL").optional().nullable().or(z.literal("")),
  showOnHomepage: z.boolean().optional(),
  showInDropdown: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateCategorySchema = createCategorySchema;

// ==========================================
// 3. BRAND SCHEMAS
// ==========================================

export const createBrandSchema = z.object({
  name: sanitizedStringSchema.pipe(z.string().min(1, "Name is required").max(100, "Name is too long")),
  slug: z
    .string()
    .max(100, "Slug is too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional()
    .or(z.literal("")),
  description: sanitizedStringSchema.pipe(z.string().max(1000, "Description is too long")).optional().nullable(),
  logoUrl: z.string().url("Invalid logo URL").optional().nullable().or(z.literal("")),
});

export const updateBrandSchema = createBrandSchema;

// ==========================================
// 4. COLLECTION SCHEMAS
// ==========================================

export const createCollectionSchema = z.object({
  name: sanitizedStringSchema.pipe(z.string().min(1, "Name is required").max(100, "Name is too long")),
  slug: z
    .string()
    .max(100, "Slug is too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional()
    .or(z.literal("")),
  description: sanitizedStringSchema.pipe(z.string().max(1000, "Description is too long")).optional().nullable(),
  type: z.enum(["manual", "dynamic"]),
  isActive: z.boolean().optional(),
  showOnHomepage: z.boolean().optional(),
  showInDropdown: z.boolean().optional(),
  showInNavbar: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  productIds: z.array(z.string()).optional(),
  rules: z
    .array(
      z.object({
        column: z.string(),
        relation: z.string(),
        value: z.string(),
      })
    )
    .optional(),
});

export const updateCollectionSchema = createCollectionSchema;

// ==========================================
// 5. ATTRIBUTE SCHEMAS
// ==========================================

export const createAttributeGroupSchema = z.object({
  name: sanitizedStringSchema.pipe(z.string().min(1, "Name is required").max(100, "Name is too long")),
  code: z
    .string()
    .max(100, "Code is too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9_]+)*$/, "Code must be lowercase alphanumeric with hyphens or underscores")
    .optional()
    .or(z.literal("")),
  attributeType: z.enum(["VARIANT", "CATALOG"]),
  filterable: z.boolean().default(true),
  searchable: z.boolean().default(true),
  visibleOnPdp: z.boolean().default(true),
  showInDropdown: z.boolean().default(false),
  displayOrder: z.coerce.number().default(0),
});

export const updateAttributeGroupSchema = z.object({
  name: sanitizedStringSchema.pipe(z.string().min(1, "Name is required").max(100, "Name is too long")),
  code: z
    .string()
    .max(100, "Code is too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9_]+)*$/, "Code must be lowercase alphanumeric with hyphens or underscores")
    .optional()
    .or(z.literal("")),
  filterable: z.boolean().default(true),
  searchable: z.boolean().default(true),
  visibleOnPdp: z.boolean().default(true),
  showInDropdown: z.boolean().default(false),
  displayOrder: z.coerce.number().default(0),
});

export const createAttributeValueSchema = z.object({
  value: sanitizedStringSchema.pipe(z.string().min(1, "Value is required").max(100, "Value is too long")),
  code: z
    .string()
    .max(100, "Code is too long")
    .regex(/^[a-z0-9_]+$/, "Code must be lowercase alphanumeric with underscores")
    .optional()
    .or(z.literal("")),
});

export const updateAttributeValueSchema = createAttributeValueSchema.partial();

// ==========================================
// 6. BUNDLE SCHEMAS
// ==========================================

const bundleFieldsSchema = z.object({
  name: sanitizedStringSchema.pipe(z.string().min(1, "Bundle name is required").max(100, "Bundle name is too long")),
  description: sanitizedStringSchema.optional().nullable(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().int().min(1, "Discount value must be at least 1"),
  startDate: z.preprocess(
    (val) => (val === "" ? null : val),
    z
      .string()
      .transform((v) => new Date(v))
      .nullable()
      .optional()
  ),
  endDate: z.preprocess(
    (val) => (val === "" ? null : val),
    z
      .string()
      .transform((v) => new Date(v))
      .nullable()
      .optional()
  ),
  isActive: z.boolean().default(true),
  productIds: z.array(z.string()).min(2, "A bundle must contain at least 2 products"),
});

export const createBundleSchema = bundleFieldsSchema.refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  {
    message: "Start date must be before or equal to end date",
    path: ["endDate"],
  }
);

export const updateBundleSchema = bundleFieldsSchema
  .partial()
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: "Start date must be before or equal to end date",
      path: ["endDate"],
    }
  );

// ==========================================
// 7. COUPON SCHEMAS
// ==========================================

export const createCouponSchema = z
  .object({
    code: z
      .string()
      .min(1, "Coupon code is required")
      .max(50, "Coupon code is too long")
      .transform((val) => val.toUpperCase().trim()),
    discountType: z.enum(["percentage", "fixed"]),
    discountValue: z.number().int().min(1, "Discount value must be at least 1"),
    minOrderAmount: z.number().int().min(0).optional().nullable(),
    maxDiscountAmount: z.number().int().min(0).optional().nullable(),
    startDate: z.string().transform((val) => new Date(val)),
    endDate: z.string().transform((val) => new Date(val)),
    usageLimit: z.number().int().min(1).optional().nullable(),
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "Start date must be before or equal to end date",
    path: ["startDate"],
  });

export const updateCouponSchema = createCouponSchema;

export const validateCouponSchema = z.object({
  code: z
    .string()
    .min(1, "Coupon code is required")
    .transform((val) => val.toUpperCase().trim()),
  subtotal: z.number().int().min(0, "Subtotal must be a positive integer"),
});
