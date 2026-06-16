import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attributeValues } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { authorize } from "@/middleware/auth";
import { slugify } from "@/lib/utils";

const updateValueSchema = z.object({
  value: z.string().min(1, "Value is required").max(100, "Value is too long").optional(),
  code: z
    .string()
    .max(100, "Code is too long")
    .regex(/^[a-z0-9_]+$/, "Code must be lowercase alphanumeric with underscores")
    .optional(),
});

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

    const { value, code } = result.data;

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

    const updated = await db
      .update(attributeValues)
      .set({
        ...(value !== undefined && { value }),
        ...(code !== undefined && { code }),
      })
      .where(eq(attributeValues.id, valueId))
      .returning();

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
