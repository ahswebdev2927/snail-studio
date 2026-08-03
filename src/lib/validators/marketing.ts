import { z } from "zod";
import { sanitizedStringSchema, sanitizedHtmlSchema } from "./sanitize";

// ==========================================
// 1. ANNOUNCEMENT SCHEMAS
// ==========================================

const announcementFieldsSchema = z.object({
  text: sanitizedStringSchema.pipe(z.string().min(1, "Text is required").max(200, "Text is too long")),
  icon: z.string().nullable().optional(),
  ctaText: sanitizedStringSchema.pipe(z.string().max(50, "CTA text is too long")).nullable().optional(),
  ctaLink: z.string().max(200, "CTA link is too long").nullable().optional(),
  textColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid text color hex code")
    .default("#ffffff"),
  backgroundColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid background color hex code")
    .default("#A95423"),
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
  sortOrder: z.number().int().default(0),
});

export const createAnnouncementSchema = announcementFieldsSchema.refine(
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

export const updateAnnouncementSchema = announcementFieldsSchema
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
// 2. HERO BANNER SCHEMAS
// ==========================================

export const createHeroBannerSchema = z.object({
  imageUrl: z
    .string()
    .min(1, "Image URL is required")
    .refine(
      (val) => val.startsWith("/") || /^(https?:\/\/)/.test(val),
      "Must be a relative path starting with '/' or an absolute HTTP(S) URL"
    ),
  title: sanitizedStringSchema.pipe(z.string().min(1, "Title is required").max(100, "Title is too long")),
  subtitle: sanitizedStringSchema.pipe(z.string().max(200, "Subtitle is too long")).optional().nullable(),
  ctaText: sanitizedStringSchema.pipe(z.string().max(50, "CTA Text is too long")).optional().nullable(),
  ctaLink: z.string().max(200, "CTA Link is too long").optional().nullable(),
  textColor: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val.trim() === "") return "#ffffff";
      return val;
    })
    .refine(
      (val) => /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val),
      "Invalid hex color"
    ),
  contentAlignment: z.enum(["left", "center", "right"]).default("center"),
  lineSpacing: z.enum(["tight", "normal", "comfortable", "loose"]).default("normal"),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateHeroBannerSchema = createHeroBannerSchema;

// ==========================================
// 3. LAUNCH OVERLAY BANNER SCHEMAS
// ==========================================

export const createLaunchBannerSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  title: sanitizedStringSchema.pipe(z.string().min(1, "Title is required").max(100, "Title is too long")),
  subtitle: sanitizedStringSchema.pipe(z.string().max(200, "Subtitle is too long")).optional().nullable(),
  backgroundImage: z.string().url("Invalid background image URL").optional().nullable().or(z.literal("")),
  productImage: z.string().url("Invalid product image URL").optional().nullable().or(z.literal("")),
  textColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid text color hex code")
    .default("#ffffff"),
  contentAlignment: z.enum(["left", "center", "right"]).default("center"),
  lineSpacing: z.enum(["tight", "normal", "comfortable", "loose"]).default("normal"),
  ctaBgColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid CTA background color hex code")
    .default("#8C5230"),
  ctaTextColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid CTA text color hex code")
    .default("#ffffff"),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateLaunchBannerSchema = createLaunchBannerSchema;

// ==========================================
// 4. CAMPAIGN SCHEMAS
// ==========================================

export const createCampaignSchema = z
  .object({
    name: sanitizedStringSchema.pipe(z.string().min(1, "Campaign name is required").max(100, "Name is too long")),
    subject: sanitizedStringSchema.pipe(z.string().min(1, "Subject line is required").max(150, "Subject is too long")),
    campaignType: z.enum(["email", "whatsapp", "sms"]),
    segmentType: z.enum(["all_users", "verified_buyers", "idle_users", "active_wishlist", "custom"]),
    segmentDetails: sanitizedStringSchema.optional().nullable(),
    templateName: sanitizedStringSchema.pipe(z.string().min(1, "Template name is required")),
    bodyHtml: sanitizedHtmlSchema.pipe(z.string().min(1, "Campaign content body is required")),
    bodyJson: z.string().optional().nullable(),
    couponId: z.string().optional().nullable(),
    featuredProductIds: z.string().optional().nullable(),
    scheduleType: z.enum(["immediate", "scheduled", "draft"]),
    scheduledAtString: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.scheduleType === "scheduled") {
        return !!data.scheduledAtString && !isNaN(Date.parse(data.scheduledAtString));
      }
      return true;
    },
    {
      message: "Please enter a valid future release date and time for scheduled campaigns",
      path: ["scheduledAtString"],
    }
  );
