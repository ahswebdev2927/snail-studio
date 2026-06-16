import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authorize } from "@/middleware/auth";

// List of settings keys that should have their values masked for security
const SENSITIVE_KEYS = ["smtp_password", "razorpay_key_secret", "meilisearch_api_key"];
const MASK_VALUE = "••••••••••••";

/**
 * GET /api/admin/settings - Fetch all system settings (Admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const rows = await db.select().from(systemSettings);
    
    // Map rows into a key-value object and mask sensitive fields
    const settingsObj: Record<string, string> = {};
    for (const row of rows) {
      if (SENSITIVE_KEYS.includes(row.key) && row.value) {
        settingsObj[row.key] = MASK_VALUE;
      } else {
        settingsObj[row.key] = row.value;
      }
    }

    return NextResponse.json(settingsObj, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/admin/settings error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/settings - Save system settings in bulk (Admin only)
 */
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

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Settings object is required" }, { status: 400 });
    }

    // Process each key-value pair
    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== "string" && typeof value !== "number") {
        continue;
      }

      const stringValue = String(value).trim();

      // If this is a sensitive key and the value is the masked placeholder, ignore it (keep existing value)
      if (SENSITIVE_KEYS.includes(key) && stringValue === MASK_VALUE) {
        continue;
      }

      // Check if key already exists in DB
      const existing = await db.query.systemSettings.findFirst({
        where: eq(systemSettings.key, key),
      });

      if (existing) {
        // Update existing key
        await db
          .update(systemSettings)
          .set({
            value: stringValue,
            updatedAt: new Date(),
          })
          .where(eq(systemSettings.key, key));
      } else {
        // Insert new key
        await db.insert(systemSettings).values({
          key,
          value: stringValue,
          updatedAt: new Date(),
        });
      }
    }

    return NextResponse.json({ success: true, message: "Settings saved successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/admin/settings error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
