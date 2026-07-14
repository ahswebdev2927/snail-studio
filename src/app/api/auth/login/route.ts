import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { db } from "@/db";
import { users, userAuditLogs } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createSession } from "@/lib/auth/refresh-token";
import { mergeGuestCartIntoCustomerCart } from "@/services/cart/cart.service";

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { idToken, name, email, whatsappNumber } = body;

    if (!idToken) {
      return NextResponse.json(
        { error: "idToken is required" },
        { status: 400 }
      );
    }

    // Verify the Firebase ID Token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (authError: any) {
      console.error("Firebase ID Token verification failed:", authError);
      return NextResponse.json(
        { error: "Invalid ID token", details: authError.message },
        { status: 401 }
      );
    }

    const { uid, phone_number: phoneNumber } = decodedToken;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Firebase token does not contain a phone number" },
        { status: 400 }
      );
    }

    // Check if user already exists
    // We check by firebaseUid or phoneNumber to ensure we don't duplicate E.164 numbers
    let user = await db.query.users.findFirst({
      where: or(
        eq(users.firebaseUid, uid),
        eq(users.phoneNumber, phoneNumber)
      ),
    });

    const now = new Date();

    if (user) {
      // Update existing user:
      // Merge firebaseUid in case we matched only on phoneNumber, and update lastLogin
      const updatedUsers = await db
        .update(users)
        .set({
          firebaseUid: uid,
          phoneVerified: true,
          lastLoginAt: now,
          updatedAt: now,
          // Update optional fields if provided and not already set
          name: name || user.name,
          email: email || user.email,
          whatsappNumber: whatsappNumber || user.whatsappNumber,
        })
        .where(eq(users.id, user.id))
        .returning();
      
      user = updatedUsers[0];
    } else {
      // Create a new user prefixed with 'usr_'
      const insertedUsers = await db
        .insert(users)
        .values({
          id: `usr_${nanoid(10)}`,
          firebaseUid: uid,
          phoneNumber: phoneNumber,
          phoneVerified: true,
          role: "customer",
          isActive: true,
          lastLoginAt: now,
          createdAt: now,
          updatedAt: now,
          name: name || null,
          email: email || null,
          whatsappNumber: whatsappNumber || null,
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

    // Write successful login event to userAuditLogs
    try {
      await db.insert(userAuditLogs).values({
        id: `aud_${nanoid(12)}`,
        userId: user.id,
        action: "login",
        entityType: "user",
        entityId: user.id,
        ipAddress: ipAddress || null,
        changes: null,
      });
    } catch (auditError) {
      console.error("Failed to write login audit log:", auditError);
    }

    // Merge guest cart to customer cart if guestCartToken cookie exists
    const guestCartToken = req.cookies.get("guestCartToken")?.value;
    if (guestCartToken) {
      try {
        await mergeGuestCartIntoCustomerCart(guestCartToken, user.id);
      } catch (mergeError) {
        console.error("Failed to merge guest cart into customer cart:", mergeError);
      }
    }

    const response = NextResponse.json({
      success: true,
      message: "Authentication successful",
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        name: user.name,
        email: user.email,
        image: user.image,
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

    if (guestCartToken) {
      response.cookies.set("guestCartToken", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    }

    return response;
  } catch (error: any) {
    console.error("Login API route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
