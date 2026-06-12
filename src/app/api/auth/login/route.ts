import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";

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
    }

    return NextResponse.json({
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
  } catch (error: any) {
    console.error("Login API route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
