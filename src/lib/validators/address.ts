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

/**
 * Normalizes a string field for exact address comparisons.
 */
function normalizeField(val: string | null | undefined): string {
  return (val || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Checks if two address objects have identical delivery fields.
 * Compares name, phone, addressLine1, addressLine2, city, state, postalCode, and country.
 */
export function areAddressesEqual(a: Partial<AddressInput> | null | undefined, b: Partial<AddressInput> | null | undefined): boolean {
  if (!a || !b) return false;

  return (
    normalizeField(a.name) === normalizeField(b.name) &&
    normalizeField(a.phone) === normalizeField(b.phone) &&
    normalizeField(a.addressLine1) === normalizeField(b.addressLine1) &&
    normalizeField(a.addressLine2) === normalizeField(b.addressLine2) &&
    normalizeField(a.city) === normalizeField(b.city) &&
    normalizeField(a.state) === normalizeField(b.state) &&
    normalizeField(a.postalCode) === normalizeField(b.postalCode) &&
    normalizeField(a.country || "India") === normalizeField(b.country || "India")
  );
}

/**
 * Computes a deterministic signature string for an address to track verification state in checkout.
 */
export function getAddressSignature(addr: Partial<AddressInput> | null | undefined): string {
  if (!addr) return "";
  return [
    normalizeField(addr.name),
    normalizeField(addr.phone),
    normalizeField(addr.addressLine1),
    normalizeField(addr.addressLine2),
    normalizeField(addr.city),
    normalizeField(addr.state),
    normalizeField(addr.postalCode),
    normalizeField(addr.country || "India"),
  ].join("|");
}

