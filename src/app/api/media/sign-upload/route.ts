import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { generateUploadSignature } from "@/lib/cloudinary/signatures";
import { z } from "zod";

const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/webm"];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const signUploadSchema = z
  .object({
    folder: z.enum([
      "products/images",
      "products/videos",
      "collections/banners",
      "categories/banners",
    ]),
    resourceType: z.enum(["image", "video"]),
    fileSize: z.number().int().positive("File size must be positive"),
    mimeType: z.string().min(1, "Mime type is required"),
  })
  .superRefine((data, ctx) => {
    // Validate folder and resource type alignment
    if (data.folder === "products/videos") {
      if (data.resourceType !== "video") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Folder 'products/videos' requires resourceType 'video'",
          path: ["folder"],
        });
      }
    } else {
      if (data.resourceType !== "image") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Folder '${data.folder}' requires resourceType 'image'`,
          path: ["folder"],
        });
      }
    }

    // Validate size and mime type based on resource type
    if (data.resourceType === "image") {
      if (!ALLOWED_IMAGE_MIME_TYPES.includes(data.mimeType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsupported image type: ${data.mimeType}. Allowed: jpeg, png, webp`,
          path: ["mimeType"],
        });
      }
      if (data.fileSize > MAX_IMAGE_SIZE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Image size exceeds 10MB limit (got ${(data.fileSize / (1024 * 1024)).toFixed(2)}MB)`,
          path: ["fileSize"],
        });
      }
    } else if (data.resourceType === "video") {
      if (!ALLOWED_VIDEO_MIME_TYPES.includes(data.mimeType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsupported video type: ${data.mimeType}. Allowed: mp4, webm`,
          path: ["mimeType"],
        });
      }
      if (data.fileSize > MAX_VIDEO_SIZE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Video size exceeds 50MB limit (got ${(data.fileSize / (1024 * 1024)).toFixed(2)}MB)`,
          path: ["fileSize"],
        });
      }
    }
  });

export async function POST(req: NextRequest) {
  try {
    // 1. Authorize Admin role
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    // 2. Parse and validate body
    const body = await req.json();
    const result = signUploadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { folder, resourceType } = result.data;

    // 3. Generate secure upload signature
    const signatureConfig = generateUploadSignature(folder, resourceType);

    // 4. Return signed credentials
    return NextResponse.json(signatureConfig);
  } catch (error) {
    console.error("Error generating signed upload signature:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
