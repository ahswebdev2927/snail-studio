import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { db } from "@/db";
import { media } from "@/db/schema";
import { z } from "zod";
import { nanoid } from "nanoid";

const registerMediaSchema = z.object({
  id: z.string().max(100).optional(),
  url: z.string().url("Invalid secure URL"),
  publicId: z.string().min(1, "Public ID is required"),
  fileName: z.string().max(255).optional().nullable(),
  fileSize: z.number().int().positive().optional().nullable(),
  format: z.string().max(50).optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  resourceType: z.enum(["image", "video"]).default("image"),
  duration: z.number().positive().optional().nullable(),
  folder: z.string().max(255).optional().nullable(),
  altText: z.string().max(1000).optional().nullable(),
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
    const result = registerMediaSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;
    const mediaId = data.id || `med_${nanoid(15)}`;

    const newMedia = {
      id: mediaId,
      url: data.url,
      publicId: data.publicId,
      fileName: data.fileName || null,
      fileSize: data.fileSize || null,
      format: data.format || null,
      width: data.width || null,
      height: data.height || null,
      resourceType: data.resourceType,
      duration: data.duration || null,
      folder: data.folder || null,
      altText: data.altText || null,
    };

    // 3. Insert into the database
    const [inserted] = await db
      .insert(media)
      .values(newMedia)
      .returning();

    // 4. Return the registered media item
    return NextResponse.json(inserted, { status: 201 });
  } catch (error) {
    console.error("Error registering media item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
