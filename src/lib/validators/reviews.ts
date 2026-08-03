import { z } from "zod";
import { sanitizedStringSchema } from "./sanitize";

/**
 * Validates product review submissions from storefront customer pages.
 */
export const reviewSubmitSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, "Rating must be at least 1 star")
    .max(5, "Rating cannot exceed 5 stars"),
  title: sanitizedStringSchema.pipe(
    z.string()
      .min(1, "Review title is required")
      .max(100, "Review title cannot exceed 100 characters")
  ),
  comment: sanitizedStringSchema.pipe(
    z.string()
      .min(1, "Review comments cannot be empty")
      .max(1500, "Review comment body cannot exceed 1500 characters")
  ),
  images: z
    .array(
      z.object({
        url: z.string().url("Invalid image URL"),
        publicId: z.string().min(1, "Public ID is required"),
        fileName: z.string().optional(),
        fileSize: z.number().max(8 * 1024 * 1024, "Image size exceeds the 8MB limit").optional(),
      })
    )
    .max(5, "You can attach up to 5 photos")
    .default([]),
});

export type ReviewSubmitInput = z.infer<typeof reviewSubmitSchema>;
