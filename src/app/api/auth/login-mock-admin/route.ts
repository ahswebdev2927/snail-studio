import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createSession } from "@/lib/auth/refresh-token";
import { triggerAdminNotification } from "@/services/notifications/notification-service";

export async function POST(req: NextRequest) {
  // Only permit this endpoint in non-production environments
  if (process.env.NODE_ENV === "production" && process.env.APP_ENV === "production") {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const adminPhone = "+919999999999";
    
    // Check if the admin user exists
    let user = await db.query.users.findFirst({
      where: eq(users.phoneNumber, adminPhone),
    });

    const now = new Date();

    if (!user) {
      // Create default admin user if not present (self-seeding behavior for dev convenience)
      const insertedUsers = await db
        .insert(users)
        .values({
          id: `usr_${nanoid(10)}`,
          firebaseUid: "admin-firebase-uid-placeholder",
          phoneNumber: adminPhone,
          phoneVerified: true,
          role: "admin",
          isActive: true,
          lastLoginAt: now,
          createdAt: now,
          updatedAt: now,
          name: "Snail Studio Admin",
          email: "admin@snailstudio.com",
        })
        .returning();
      
      user = insertedUsers[0];
    } else {
      // Update last login
      const updatedUsers = await db
        .update(users)
        .set({
          lastLoginAt: now,
          updatedAt: now,
        })
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

    // Dispatch system alert notification for admin login
    try {
      await triggerAdminNotification({
        category: "system",
        title: "Administrator Sign-In",
        message: `Admin user '${user.name || "Admin"}' signed in successfully from IP: ${ipAddress || "local"}.`,
        priority: "low",
        data: {
          action: "admin_login",
          entityType: "user",
          entityId: user.id
        }
      });
    } catch (err) {
      console.error("Failed to trigger admin login notification:", err);
    }

    const response = NextResponse.json({
      success: true,
      message: "Development Admin authentication successful",
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        name: user.name,
        email: user.email,
      },
    });

    // Set HttpOnly secure cookies (Same options as regular auth endpoint)
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
    console.error("Mock Login API route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
