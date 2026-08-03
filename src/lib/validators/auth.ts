import { z } from "zod";
import { sanitizedStringSchema } from "./sanitize";

/**
 * Validates login input. Requires +91 prefix followed by exactly 10 digits.
 */
export const loginPhoneSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+91\d{10}$/, "Phone number must be in the format +91 followed by 10 digits (e.g. +919876543210)"),
});

/**
 * Validates OTP input. Requires exactly 6 digits.
 */
export const otpVerificationSchema = z.object({
  otp: z
    .string()
    .min(1, "Verification code is required")
    .regex(/^\d{6}$/, "Verification code must be exactly 6 digits"),
});

/**
 * Validates customer profile details completion and settings updates.
 */
export const profileCompletionSchema = z.object({
  name: sanitizedStringSchema.pipe(
    z.string()
      .min(1, "Full name is required")
      .max(100, "Name cannot exceed 100 characters")
  ),
  email: z
    .string()
    .min(1, "Email address is required")
    .email("Please enter a valid email address")
    .max(150, "Email address cannot exceed 150 characters"),
  whatsappNumber: z
    .string()
    .regex(/^\+91\d{10}$/, "WhatsApp number must start with +91 followed by 10 digits")
    .optional()
    .nullable()
    .or(z.literal("")),
  image: z
    .string()
    .url("Invalid avatar image URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  marketingConsent: z.boolean().default(false),
  preferences: z
    .object({
      newsletter: z.boolean().default(true),
      promotions: z.boolean().default(true),
      launchNotifications: z.boolean().default(true),
      backInStock: z.boolean().default(true),
      productUpdates: z.boolean().default(true),
      priceDrops: z.boolean().default(true),
    })
    .optional(),
});

export type LoginPhoneInput = z.infer<typeof loginPhoneSchema>;
export type OtpVerificationInput = z.infer<typeof otpVerificationSchema>;
export type ProfileCompletionInput = z.infer<typeof profileCompletionSchema>;

/**
 * Validates storefront customer contact and support requests.
 */
export const contactSupportSchema = z.object({
  name: sanitizedStringSchema.pipe(
    z.string()
      .min(1, "Full name is required")
      .max(100, "Name cannot exceed 100 characters")
  ),
  email: z
    .string()
    .min(1, "Email address is required")
    .email("Please enter a valid email address")
    .max(150, "Email address cannot exceed 150 characters"),
  subject: sanitizedStringSchema.pipe(
    z.string()
      .min(1, "Subject is required")
      .max(150, "Subject cannot exceed 150 characters")
  ),
  message: sanitizedStringSchema.pipe(
    z.string()
      .min(1, "Message cannot be empty")
      .max(2000, "Message details are too long")
  ),
});

export type ContactSupportInput = z.infer<typeof contactSupportSchema>;

/**
 * Validates tracking number lookup.
 */
export const trackingLookupSchema = z.object({
  trackingNumber: sanitizedStringSchema.pipe(
    z.string()
      .min(1, "Tracking number is required")
      .max(100, "Tracking number too long")
  ),
});

export type TrackingLookupInput = z.infer<typeof trackingLookupSchema>;

/**
 * Validates order lookup search verification inputs.
 */
export const orderLookupSchema = z.object({
  orderId: sanitizedStringSchema.pipe(
    z.string()
      .min(1, "Order number is required")
      .max(100, "Order number too long")
  ),
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(150, "Email address is too long")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .regex(/^\+91\d{10}$/, "Phone number must be in E.164 format starting with +91 (e.g. +919876543210)")
    .optional()
    .or(z.literal("")),
});

export type OrderLookupInput = z.infer<typeof orderLookupSchema>;
