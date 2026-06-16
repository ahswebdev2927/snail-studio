import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attributeGroups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { authorize } from "@/middleware/auth";
import { slugify } from "@/lib/utils";

const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  code: z
    .string()
    .max(100, "Code is too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9_]+)*$/, "Code must be lowercase alphanumeric with hyphens or underscores")
    .optional()
    .or(z.literal("")),
});

// GET /api/admin/attributes - List all attribute groups and values (Admin only)
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const allGroups = await db.query.attributeGroups.findMany({
      with: {
        values: {
          orderBy: (av, { asc }) => [asc(av.value)],
        },
      },
      orderBy: (ag, { asc }) => [asc(ag.name)],
    });

    return NextResponse.json(allGroups, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/admin/attributes error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

// POST /api/admin/attributes - Create a new attribute group (Admin only)
export async function POST(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = createGroupSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name } = result.data;
    let code = result.data.code;

    if (!code) {
      code = slugify(name).replace(/-/g, "_"); // use underscores for DB code mapping consistency
    }

    if (!code) {
      return NextResponse.json({ error: "Could not generate a valid code from name" }, { status: 400 });
    }

    // Check conflict
    const existing = await db.query.attributeGroups.findFirst({
      where: eq(attributeGroups.code, code),
    });

    if (existing) {
      return NextResponse.json(
        { error: `Attribute group with code "${code}" already exists` },
        { status: 400 }
      );
    }

    const newGroupId = `attr_grp_${nanoid(10)}`;
    const inserted = await db
      .insert(attributeGroups)
      .values({
        id: newGroupId,
        name,
        code,
      })
      .returning();

    return NextResponse.json({ ...inserted[0], values: [] }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/attributes error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
