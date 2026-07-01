import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createSession } from "@/lib/auth/refresh-token";

export async function POST(req: NextRequest) {
  // Only permit this endpoint in non-production environments
  if (process.env.NODE_ENV === "production" && process.env.APP_ENV === "production") {
    return new Response("Not Found", { status: 404 });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const rawPhone = body.phoneNumber || "+919999988888";
    // Normalize phone number (E.164-ish simple formatting)
    const phoneNumber = rawPhone.replace(/\s+/g, "");

    // Check if the user exists
    let user = await db.query.users.findFirst({
      where: eq(users.phoneNumber, phoneNumber),
    });

    const now = new Date();

    if (!user) {
      // Create new customer user record
      const insertedUsers = await db
        .insert(users)
        .values({
          id: `usr_${nanoid(10)}`,
          firebaseUid: `guest-firebase-${nanoid(10)}`,
          phoneNumber: phoneNumber,
          phoneVerified: true,
          role: "customer",
          isActive: true,
          lastLoginAt: now,
          createdAt: now,
          updatedAt: now,
          name: body.name || `Customer ${phoneNumber.slice(-4)}`,
          email: body.email || `customer-${phoneNumber.slice(-4)}@example.com`,
          whatsappNumber: body.whatsappNumber || null,
        })
        .returning();
      
      user = insertedUsers[0];

      // Trigger new customer registration notification
      try {
        const { triggerAdminNotification } = await import("@/services/notifications/notification-service");
        await triggerAdminNotification({
          category: "system",
          title: "New Customer Registered",
          message: `Customer '${user.name || "Customer"}' registered successfully.\nEmail: ${user.email || "N/A"}\nPhone: ${user.phoneNumber}\nWhatsApp: ${user.whatsappNumber || "N/A"}`,
          priority: "medium",
          data: {
            action: "customer_registered",
            entityType: "user",
            entityId: user.id
          }
        });
      } catch (err) {
        console.error("Failed to trigger registration notification:", err);
      }
    } else {
      // Update last login and potentially email/name if provided
      const updateData: any = {
        lastLoginAt: now,
        updatedAt: now,
      };
      if (body.name) updateData.name = body.name;
      if (body.email) updateData.email = body.email;

      const updatedUsers = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, user.id))
        .returning();
      
      user = updatedUsers[0];
    }

    // Extract client IP address and device User-Agent
    const userAgent = req.headers.get("user-agent") || undefined;
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      undefined;

    // Create session (JWT access token + database-backed refresh token)
    const { accessToken, refreshToken, expiresAt } = await createSession(
      user.id,
      userAgent,
      ipAddress
    );

    const response = NextResponse.json({
      success: true,
      message: "Customer authentication successful",
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        name: user.name,
        email: user.email,
      },
    });

    // Set HttpOnly secure cookies
    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });

    const refreshTokenMaxAge = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: refreshTokenMaxAge,
    });

    return response;
  } catch (error: any) {
    console.error("Mock Customer Login API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
