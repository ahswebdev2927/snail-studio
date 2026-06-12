import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAccessToken } from "./jwt";
import { isBlacklisted } from "./blacklist";

export interface SessionUser {
  id: string;
  firebaseUid: string;
  phoneNumber: string;
  whatsappNumber: string | null;
  email: string | null;
  name: string | null;
  image: string | null;
  role: "customer" | "admin";
  isActive: boolean;
}

/**
 * Resolves current user details from a validated access token string.
 * Returns null if the token is invalid, expired, blacklisted, or if the user is inactive/not found.
 */
export async function getSessionUser(accessToken: string): Promise<SessionUser | null> {
  try {
    const decoded = verifyAccessToken(accessToken);

    // Verify JTI is not blacklisted
    const blacklisted = await isBlacklisted(decoded.jti);
    if (blacklisted) {
      return null;
    }

    // Load user profile
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.sub),
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      firebaseUid: user.firebaseUid,
      phoneNumber: user.phoneNumber,
      whatsappNumber: user.whatsappNumber,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
      isActive: user.isActive,
    };
  } catch (error) {
    return null;
  }
}
