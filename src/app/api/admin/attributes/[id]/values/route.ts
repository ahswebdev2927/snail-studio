import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attributeGroups, attributeValues } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { authorize } from "@/middleware/auth";
import { slugify } from "@/lib/utils";

const createValueSchema = z.object({
  value: z.string().min(1, "Value is required").max(100, "Value is too long"),
  code: z
    .string()
    .max(100, "Code is too long")
    .regex(/^[a-z0-9_]+$/, "Code must be lowercase alphanumeric with underscores")
    .optional()
    .or(z.literal("")),
});

// POST /api/admin/attributes/[id]/values - Create a new attribute value under a group (Admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: groupId } = await params;
    if (!groupId) {
      return NextResponse.json({ error: "Attribute Group ID is required" }, { status: 400 });
    }

    // Check if group exists
    const group = await db.query.attributeGroups.findFirst({
      where: eq(attributeGroups.id, groupId),
    });

    if (!group) {
      return NextResponse.json({ error: "Attribute Group not found" }, { status: 404 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = createValueSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { value } = result.data;
    let code = result.data.code;

    if (!code) {
      code = slugify(value).replace(/-/g, "_");
    }

    if (!code) {
      return NextResponse.json({ error: "Could not generate a valid code from value" }, { status: 400 });
    }

    // Check conflict of value or code under the same group
    const existing = await db.query.attributeValues.findFirst({
      where: and(
        eq(attributeValues.groupId, groupId),
        eq(attributeValues.code, code)
      ),
    });

    if (existing) {
      return NextResponse.json(
        { error: `Value with code "${code}" already exists in this group` },
        { status: 400 }
      );
    }

    const newValueId = `attr_val_${nanoid(10)}`;
    const inserted = await db
      .insert(attributeValues)
      .values({
        id: newValueId,
        groupId,
        value,
        code,
      })
      .returning();

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/attributes/[id]/values error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
