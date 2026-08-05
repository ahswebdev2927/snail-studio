import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { db } from "@/db";
import { users, userAuditLogs, wishlists, wishlistItems, recentlyViewed, carts } from "@/db/schema";
import { eq, or, and, inArray, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createSession } from "@/lib/auth/refresh-token";
import { mergeGuestCartIntoCustomerCart } from "@/services/cart/cart.service";
import { rateLimitRequest } from "@/lib/security/rate-limit";
import { logRouteHandler } from "@/lib/logger/request";
import DOMPurify from "isomorphic-dompurify";

async function postHandler(req: NextRequest) {
  const reqLogger = (req as any).log;
  try {
    // Rate limit: 5 signup requests per 1 minute
    const limitResult = await rateLimitRequest(req, "auth:signup", 5, 60 * 1000);
    if (!limitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(limitResult.reset / 1000).toString(),
          },
        }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const {
      idToken,
      name,
      email,
      whatsappNumber,
      marketingConsent,
      localWishlist,
      localRecentlyViewed,
      couponCode,
    } = body;

    if (!idToken || !name || !email || !whatsappNumber) {
      return NextResponse.json(
        { error: "Missing required fields: idToken, name, email, and whatsappNumber are required." },
        { status: 400 }
      );
    }

    // Server-side input sanitization
    const sanitizedName = DOMPurify.sanitize(name.trim());
    const sanitizedEmail = DOMPurify.sanitize(email.trim().toLowerCase());
    const sanitizedWhatsapp = DOMPurify.sanitize(whatsappNumber.trim());

    // Basic formats validation
    if (sanitizedName.length < 1 || sanitizedName.length > 100) {
      return NextResponse.json({ error: "Full name must be between 1 and 100 characters." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail) || sanitizedEmail.length > 150) {
      return NextResponse.json({ error: "Invalid email address format." }, { status: 400 });
    }
    if (!/^\+91\d{10}$/.test(sanitizedWhatsapp)) {
      return NextResponse.json({ error: "WhatsApp number must start with +91 followed by 10 digits." }, { status: 400 });
    }

    // Verify the Firebase ID Token to fetch the verified phone number
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (authError: any) {
      reqLogger.error({ err: authError }, "Firebase ID Token verification failed during signup");
      return NextResponse.json(
        { error: "Invalid ID token", details: authError.message },
        { status: 401 }
      );
    }

    const { uid, phone_number: phoneNumber } = decodedToken;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Firebase token does not contain a verified phone number" },
        { status: 400 }
      );
    }

    const now = new Date();
    let user: typeof users.$inferSelect | undefined;

    // Check if user already exists to guarantee idempotency
    const existingUser = await db.query.users.findFirst({
      where: or(
        eq(users.firebaseUid, uid),
        eq(users.phoneNumber, phoneNumber)
      ),
    });

    if (existingUser) {
      // If the user already exists, update their details and perform normal login flow
      const updatedUsers = await db
        .update(users)
        .set({
          firebaseUid: uid,
          phoneVerified: true,
          lastLoginAt: now,
          updatedAt: now,
          name: sanitizedName,
          email: sanitizedEmail,
          whatsappNumber: sanitizedWhatsapp,
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      user = updatedUsers[0];
    } else {
      // Transactionally insert the new user and perform initial setup
      await db.transaction(async (tx) => {
        const insertedUsers = await tx
          .insert(users)
          .values({
            id: `usr_${nanoid(10)}`,
            firebaseUid: uid,
            phoneNumber: phoneNumber, // Derived directly from the secure decoded Firebase token
            phoneVerified: true,
            role: "customer",
            isActive: true,
            name: sanitizedName,
            email: sanitizedEmail,
            whatsappNumber: sanitizedWhatsapp,
            marketingConsent: !!marketingConsent,
            lastLoginAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        user = insertedUsers[0];
      });

      if (user) {
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
              entityId: user.id,
            },
          });
        } catch (err) {
          reqLogger.error({ err }, "Failed to trigger registration notification");
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Failed to create user record." },
        { status: 500 }
      );
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

    // Write audit event
    try {
      await db.insert(userAuditLogs).values({
        id: `aud_${nanoid(12)}`,
        userId: user.id,
        action: existingUser ? "login" : "register",
        entityType: "user",
        entityId: user.id,
        ipAddress: ipAddress || null,
        changes: null,
      });
    } catch (auditError) {
      reqLogger.error({ err: auditError }, "Failed to write signup audit log");
    }

    // Merge guest cart to customer cart if guestCartToken cookie exists
    const guestCartToken = req.cookies.get("guestCartToken")?.value;
    if (guestCartToken) {
      try {
        await mergeGuestCartIntoCustomerCart(guestCartToken, user.id);
      } catch (mergeError) {
        reqLogger.error({ err: mergeError }, "Failed to merge guest cart during signup");
      }
    }

    // Merge guest wishlist
    if (localWishlist && Array.isArray(localWishlist) && localWishlist.length > 0) {
      try {
        let wishlist = await db.query.wishlists.findFirst({
          where: eq(wishlists.userId, user.id),
        });
        if (!wishlist) {
          const wishlistId = `wsh_${nanoid(10)}`;
          await db.insert(wishlists).values({
            id: wishlistId,
            userId: user.id,
          });
          wishlist = { id: wishlistId, userId: user.id, createdAt: now };
        }
        const dbItems = await db.query.wishlistItems.findMany({
          where: eq(wishlistItems.wishlistId, wishlist.id),
        });
        const dbProductIds = dbItems.map((item) => item.productId);
        const missingProductIds = localWishlist.filter((id) => !dbProductIds.includes(id));
        if (missingProductIds.length > 0) {
          await db.insert(wishlistItems).values(
            missingProductIds.map((pid) => ({
              wishlistId: wishlist!.id,
              productId: pid,
            }))
          );
        }
      } catch (wishlistErr) {
        reqLogger.error({ err: wishlistErr }, "Failed to merge wishlist during signup");
      }
    }

    // Merge guest recently viewed
    if (localRecentlyViewed && Array.isArray(localRecentlyViewed) && localRecentlyViewed.length > 0) {
      try {
        for (const pid of localRecentlyViewed) {
          await db.delete(recentlyViewed)
            .where(and(eq(recentlyViewed.userId, user.id), eq(recentlyViewed.productId, pid)));
          await db.insert(recentlyViewed).values({
            id: `view_${nanoid(12)}`,
            userId: user.id,
            productId: pid,
          });
        }
        const userViews = await db
          .select({ id: recentlyViewed.id })
          .from(recentlyViewed)
          .where(eq(recentlyViewed.userId, user.id))
          .orderBy(desc(recentlyViewed.createdAt));

        if (userViews.length > 20) {
          const idsToDelete = userViews.slice(20).map((v) => v.id);
          await db.delete(recentlyViewed).where(inArray(recentlyViewed.id, idsToDelete));
        }
      } catch (rvErr) {
        reqLogger.error({ err: rvErr }, "Failed to merge recently viewed during signup");
      }
    }

    // Validate coupon code
    let couponValidation = null;
    if (couponCode) {
      try {
        const userCart = await db.query.carts.findFirst({
          where: eq(carts.userId, user.id),
          with: {
            items: {
              with: {
                variant: true,
              },
            },
          },
        });
        if (userCart && userCart.items.length > 0) {
          const subtotal = userCart.items.reduce(
            (sum, item) => sum + item.variant.price * item.quantity,
            0
          );
          const { validateCoupon } = await import("@/services/checkout/coupon-engine.service");
          couponValidation = await validateCoupon(couponCode, subtotal, userCart.id, user.id);
        }
      } catch (couponErr) {
        reqLogger.error({ err: couponErr }, "Failed to validate coupon during signup");
      }
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      couponValidation,
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
    reqLogger.error({ err: error }, "Signup API route error");
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export const POST = logRouteHandler(postHandler);
