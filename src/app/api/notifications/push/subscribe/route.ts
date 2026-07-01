import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

// POST /api/notifications/push/subscribe - Register or assign an FCM token for the admin
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("accessToken")?.value;

    if (!tokenCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getSessionUser(tokenCookie);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { token, deviceName } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Check if subscription token already exists in DB
    const existing = await db.query.pushSubscriptions.findFirst({
      where: eq(pushSubscriptions.token, token),
    });

    if (existing) {
      if (existing.userId !== user.id) {
        // Re-assign token to current admin user if a different user previously held it
        await db
          .update(pushSubscriptions)
          .set({ userId: user.id, deviceName: deviceName || existing.deviceName })
          .where(eq(pushSubscriptions.id, existing.id));
      } else if (deviceName && deviceName !== existing.deviceName) {
        // Update device name if it has changed
        await db
          .update(pushSubscriptions)
          .set({ deviceName })
          .where(eq(pushSubscriptions.id, existing.id));
      }
    } else {
      // Create new subscription record
      await db.insert(pushSubscriptions).values({
        id: `sub_${nanoid(12)}`,
        userId: user.id,
        token,
        deviceName: deviceName || null,
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/notifications/push/subscribe error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
