import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";
import {
  getAdminNotificationPreferences,
  updateAdminNotificationPreferences,
} from "@/services/notifications/notification-service";

export const dynamic = "force-dynamic";

// GET /api/notifications/preferences - Retrieve preferences for the authenticated admin
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getSessionUser(token);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await getAdminNotificationPreferences(user.id);
    return NextResponse.json({ preferences }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/notifications/preferences error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT /api/notifications/preferences - Update preference overrides for a category
export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getSessionUser(token);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { category, email, inApp, push } = body;

    if (!category || !["orders", "inventory", "reviews", "system"].includes(category)) {
      return NextResponse.json({ error: "Invalid notification category" }, { status: 400 });
    }

    await updateAdminNotificationPreferences(user.id, category, { email, inApp, push });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("PUT /api/notifications/preferences error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
