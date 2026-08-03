import { z } from "zod";
import { sanitizedStringSchema } from "./sanitize";

/**
 * Standard address validation schema. Shared by storefront customer addresses,
 * order checkouts, and admin operations.
 */
export const addressSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["shipping", "billing"], {
    message: "Address type must be either 'shipping' or 'billing'",
  }),
  name: sanitizedStringSchema.pipe(
    z.string()
      .min(1, "Recipient name is required")
      .max(100, "Recipient name cannot exceed 100 characters")
  ),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+91\d{10}$/, "Phone number must start with +91 followed by 10 digits (e.g. +919876543210)"),
  addressLine1: sanitizedStringSchema.pipe(
    z.string()
      .min(1, "Address Line 1 is required")
      .max(250, "Address details are too long")
  ),
  addressLine2: sanitizedStringSchema.pipe(
    z.string().max(250, "Address line 2 details are too long")
  )
    .optional()
    .nullable()
    .or(z.literal("")),
  city: sanitizedStringSchema.pipe(
    z.string()
      .min(1, "City is required")
      .max(100, "City name is too long")
  ),
  state: sanitizedStringSchema.pipe(
    z.string()
      .min(1, "State is required")
      .max(100, "State name is too long")
  ),
  postalCode: z
    .string()
    .min(1, "Pincode is required")
    .regex(/^[1-9][0-9]{5}$/, "Please enter a valid 6-digit Indian PIN code (e.g. 110001)"),
  country: sanitizedStringSchema.pipe(
    z.string()
      .min(1, "Country is required")
      .max(100, "Country name is too long")
  )
    .default("India"),
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;
