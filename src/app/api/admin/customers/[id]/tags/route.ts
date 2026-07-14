import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customerTags, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authorize } from "@/middleware/auth";

// POST /api/admin/customers/[id]/tags - Associate a tag with a customer (Admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: userId } = await params;

    // Validate customer exists
    const customer = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!customer || customer.role !== "customer") {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const tag = (body.tag || "").trim();
    if (!tag) {
      return NextResponse.json({ error: "Tag is required" }, { status: 400 });
    }

    // Check if tag already exists for this user
    const existing = await db.query.customerTags.findFirst({
      where: and(eq(customerTags.userId, userId), eq(customerTags.tag, tag)),
    });

    if (existing) {
      return NextResponse.json({ success: true, message: "Tag already exists" }, { status: 200 });
    }

    // Insert new tag
    await db.insert(customerTags).values({
      id: `tag_${nanoid(12)}`,
      userId,
      tag,
    });

    return NextResponse.json({ success: true, tag }, { status: 201 });

  } catch (error: any) {
    console.error("POST /api/admin/customers/[id]/tags error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/customers/[id]/tags - Remove a tag association from a customer (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: userId } = await params;
    const { searchParams } = new URL(req.url);
    
    // Support retrieving tag from query param or body
    let tag = (searchParams.get("tag") || "").trim();
    
    if (!tag) {
      try {
        const body = await req.json();
        tag = (body.tag || "").trim();
      } catch {
        // Body reading failed, fallback
      }
    }

    if (!tag) {
      return NextResponse.json({ error: "Tag parameter or body field is required" }, { status: 400 });
    }

    // Delete matching tag entry
    await db
      .delete(customerTags)
      .where(and(eq(customerTags.userId, userId), eq(customerTags.tag, tag)));

    return NextResponse.json({ success: true, tag, message: "Tag association removed" }, { status: 200 });

  } catch (error: any) {
    console.error("DELETE /api/admin/customers/[id]/tags error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
