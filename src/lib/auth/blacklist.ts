import { db } from "@/db";
import { tokenBlacklist } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Checks if a JTI (JWT ID) has been blacklisted (revoked).
 */
export async function isBlacklisted(jti: string): Promise<boolean> {
  const record = await db.query.tokenBlacklist.findFirst({
    where: eq(tokenBlacklist.jti, jti),
  });
  return !!record;
}

/**
 * Blacklists a JTI (JWT ID) until its expiration time.
 */
export async function blacklistToken(jti: string, expiresAt: Date): Promise<void> {
  const exists = await isBlacklisted(jti);
  if (exists) return;

  await db.insert(tokenBlacklist).values({
    id: `bl_${nanoid(10)}`,
    jti,
    expiresAt,
    createdAt: new Date(),
  });
}
