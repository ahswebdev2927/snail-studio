import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { attributeGroups, attributeValues } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { authorize } from "@/middleware/auth";
import { slugify } from "@/lib/utils";
import { updateAttributeValueSchema as updateValueSchema } from "@/lib/validators/catalog";
import { CACHE_TAGS } from "@/lib/cache-tags";

// PUT /api/admin/attributes/[id]/values/[valueId] - Update specific attribute value (Admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; valueId: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: groupId, valueId } = await params;
    if (!groupId || !valueId) {
      return NextResponse.json({ error: "Group ID and Value ID are required" }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = updateValueSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { value, colorHex } = result.data;
    let code = result.data.code;

    // Check if group exists
    const group = await db.query.attributeGroups.findFirst({
      where: eq(attributeGroups.id, groupId),
    });

    if (!group) {
      return NextResponse.json({ error: "Attribute Group not found" }, { status: 404 });
    }

    // Check existence
    const existing = await db.query.attributeValues.findFirst({
      where: and(
        eq(attributeValues.id, valueId),
        eq(attributeValues.groupId, groupId)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: "Attribute value not found under this group" }, { status: 404 });
    }

    // Normalize code to lowercase to ensure consistency (e.g. PINK -> pink)
    if (code) {
      code = code.toLowerCase();
    }

    // Check conflict of code if code is changed
    if (code && code !== existing.code) {
      const conflict = await db.query.attributeValues.findFirst({
        where: and(
          eq(attributeValues.groupId, groupId),
          eq(attributeValues.code, code)
        ),
      });

      if (conflict) {
        return NextResponse.json(
          { error: `Value with code "${code}" already exists in this group` },
          { status: 400 }
        );
      }
    }

    let normalizedColorHex = undefined;
    if (colorHex !== undefined) {
      if (group.code === "colour") {
        if (!colorHex) {
          return NextResponse.json({ error: "Hex code is required for Colour attribute values" }, { status: 400 });
        }
        const cleanHex = colorHex.trim();
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!hexRegex.test(cleanHex)) {
          return NextResponse.json({ error: "Invalid hex color format" }, { status: 400 });
        }
        normalizedColorHex = "#" + cleanHex.replace("#", "").toUpperCase();
      } else {
        normalizedColorHex = colorHex ? colorHex.trim() : null;
      }
    }

    const updated = await db
      .update(attributeValues)
      .set({
        ...(value !== undefined && { value }),
        ...(code !== undefined && { code }),
        ...(normalizedColorHex !== undefined && { colorHex: normalizedColorHex }),
      })
      .where(eq(attributeValues.id, valueId))
      .returning();

    revalidateTag(CACHE_TAGS.NAVIGATION, "max");

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error: any) {
    console.error("PUT /api/admin/attributes/[id]/values/[valueId] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/attributes/[id]/values/[valueId] - Delete specific attribute value (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; valueId: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: groupId, valueId } = await params;
    if (!groupId || !valueId) {
      return NextResponse.json({ error: "Group ID and Value ID are required" }, { status: 400 });
    }

    const existing = await db.query.attributeValues.findFirst({
      where: and(
        eq(attributeValues.id, valueId),
        eq(attributeValues.groupId, groupId)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: "Attribute value not found under this group" }, { status: 404 });
    }

    // Deleting the value will cascade delete associations in product/variant attribute tables
    await db.delete(attributeValues).where(eq(attributeValues.id, valueId));

    revalidateTag(CACHE_TAGS.NAVIGATION, "max");

    return NextResponse.json(
      { success: true, message: "Attribute value deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("DELETE /api/admin/attributes/[id]/values/[valueId] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
