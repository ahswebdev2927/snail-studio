import { z } from "zod";
import { sanitizedStringSchema } from "./sanitize";

// ==========================================
// 1. SIZE PROFILE SCHEMAS
// ==========================================

export const createSizeProfileSchema = z.object({
  name: sanitizedStringSchema.pipe(z.string().min(1, "Name is required").max(20, "Name is too long")),
  description: sanitizedStringSchema.pipe(z.string().max(200, "Description is too long")).default(""),
  thumb: z.number().int().min(5, "Thumb width must be at least 5mm").max(25, "Thumb width cannot exceed 25mm"),
  index: z.number().int().min(5, "Index width must be at least 5mm").max(25, "Index width cannot exceed 25mm"),
  middle: z.number().int().min(5, "Middle width must be at least 5mm").max(25, "Middle width cannot exceed 25mm"),
  ring: z.number().int().min(5, "Ring width must be at least 5mm").max(25, "Ring width cannot exceed 25mm"),
  pinky: z.number().int().min(5, "Pinky width must be at least 5mm").max(25, "Pinky width cannot exceed 25mm"),
  isActive: z.boolean().default(true),
});

export const updateSizeProfileSchema = createSizeProfileSchema;

// ==========================================
// 2. LENGTH CHART SCHEMAS
// ==========================================

export const lengthChartSchema = z.object({
  shape: sanitizedStringSchema.pipe(z.string().min(1, "Nail shape is required").max(50, "Shape is too long")),
  short: z.number().min(0, "Length value must be positive").optional().nullable(),
  medium: z.number().min(0, "Length value must be positive").optional().nullable(),
  long: z.number().min(0, "Length value must be positive").optional().nullable(),
  extraLong: z.number().min(0, "Length value must be positive").optional().nullable(),
  displayOrder: z.number().int().default(0),
});

// ==========================================
// 3. GENERAL SETTINGS SCHEMA
// ==========================================

export const generalSettingsSchema = z.object({
  storeName: sanitizedStringSchema.pipe(z.string().min(1, "Store name is required").max(100, "Store name is too long")),
  supportEmail: z.string().min(1, "Support email is required").email("Please enter a valid support email address"),
  supportPhone: z
    .string()
    .min(1, "Support phone number is required")
    .regex(/^\+91\d{10}$/, "Support phone must be in the format +91 followed by 10 digits (e.g. +919876543210)"),
  storeAddress: sanitizedStringSchema.pipe(z.string().min(1, "Store address details are required").max(500, "Store address details are too long")),
  currencyCode: z.string().default("INR").transform((c) => c.toUpperCase()),
  metaTitle: sanitizedStringSchema.pipe(z.string().max(100, "Meta title is too long")).optional().nullable(),
  metaDescription: sanitizedStringSchema.pipe(z.string().max(250, "Meta description is too long")).optional().nullable(),
});

// ==========================================
// 4. SMTP SETTINGS SCHEMA
// ==========================================

export const smtpSettingsSchema = z.object({
  smtpHost: z.string().min(1, "SMTP host is required"),
  smtpPort: z.coerce.number().int().min(1, "Port must be at least 1").max(65535, "Port cannot exceed 65535"),
  smtpUsername: z.string().min(1, "SMTP username is required"),
  smtpPassword: z.string().min(1, "SMTP password is required"),
  fromEmail: z.string().min(1, "From email is required").email("Please enter a valid from email address"),
  fromName: sanitizedStringSchema.pipe(z.string().min(1, "Sender display name is required").max(100, "Name is too long")),
  testEmail: z.string().email("Please enter a valid test recipient email").optional().nullable().or(z.literal("")),
});

// ==========================================
// 5. PAYMENT SETTINGS SCHEMA
// ==========================================

export const paymentSettingsSchema = z.object({
  isSandbox: z.boolean().default(true),
  razorpayKeyId: z.string().min(1, "Razorpay Key ID is required"),
  razorpayKeySecret: z.string().min(1, "Razorpay Key Secret is required"),
  enableMockPayments: z.boolean().default(true),
});

// ==========================================
// 6. SHIPPING SETTINGS SCHEMA
// ==========================================

export const shippingSettingsSchema = z.object({
  standardShippingCost: z.coerce.number().int().min(0, "Standard cost cannot be negative"),
  expressShippingCost: z.coerce.number().int().min(0, "Express cost cannot be negative"),
  freeShippingThreshold: z.coerce.number().int().min(0, "Threshold cannot be negative"),
  allowedCountries: z.array(z.string()).min(1, "At least one country must be allowed"),
});

// ==========================================
// 7. SEARCH SETTINGS SCHEMA
// ==========================================

export const searchSettingsSchema = z.object({
  fuseThreshold: z.coerce.number().min(0).max(1, "Threshold must be between 0 and 1"),
  weightName: z.coerce.number().min(0).max(10, "Weight must be between 0 and 10"),
  weightDescription: z.coerce.number().min(0).max(10, "Weight must be between 0 and 10"),
  weightCategory: z.coerce.number().min(0).max(10, "Weight must be between 0 and 10"),
  weightTags: z.coerce.number().min(0).max(10, "Weight must be between 0 and 10"),
});

// ==========================================
// 8. SECURITY SETTINGS SCHEMA
// ==========================================

export const securitySettingsSchema = z.object({
  maxRequestsPerMinute: z.coerce.number().int().min(10, "Rate limit threshold must be at least 10"),
  blockDurationSeconds: z.coerce.number().int().min(10, "Block duration must be at least 10 seconds"),
  enableAdminIpLock: z.boolean().default(false),
  allowedAdminIps: z.array(z.string()).default([]),
});
