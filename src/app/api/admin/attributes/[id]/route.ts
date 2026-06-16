import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attributeGroups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authorize } from "@/middleware/auth";
import { slugify } from "@/lib/utils";

const updateGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long").optional(),
  code: z
    .string()
    .max(100, "Code is too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9_]+)*$/, "Code must be lowercase alphanumeric with hyphens or underscores")
    .optional(),
});

// PUT /api/admin/attributes/[id] - Update attribute group details (Admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Attribute Group ID is required" }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = updateGroupSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, code } = result.data;

    // Check existence
    const existing = await db.query.attributeGroups.findFirst({
      where: eq(attributeGroups.id, id),
    });

    if (!existing) {
      return NextResponse.json({ error: "Attribute Group not found" }, { status: 404 });
    }

    // Check code conflict if code changes
    if (code && code !== existing.code) {
      const conflict = await db.query.attributeGroups.findFirst({
        where: eq(attributeGroups.code, code),
      });

      if (conflict) {
        return NextResponse.json(
          { error: `Attribute group with code "${code}" already exists` },
          { status: 400 }
        );
      }
    }

    const updated = await db
      .update(attributeGroups)
      .set({
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
      })
      .where(eq(attributeGroups.id, id))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error: any) {
    console.error("PUT /api/admin/attributes/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/attributes/[id] - Delete attribute group (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Attribute Group ID is required" }, { status: 400 });
    }

    const existing = await db.query.attributeGroups.findFirst({
      where: eq(attributeGroups.id, id),
    });

    if (!existing) {
      return NextResponse.json({ error: "Attribute Group not found" }, { status: 404 });
    }

    // Deleting the group will cascade delete all linked values
    await db.delete(attributeGroups).where(eq(attributeGroups.id, id));

    return NextResponse.json(
      { success: true, message: "Attribute group deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("DELETE /api/admin/attributes/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
