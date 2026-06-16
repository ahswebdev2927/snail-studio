import { db } from "@/db";
import { refreshTokens, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./jwt";

export interface SessionResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getRefreshTokenExpiryDate(): Date {
  const expiryStr = process.env.REFRESH_TOKEN_EXPIRY || "7d";
  const now = new Date();

  const match = expiryStr.match(/^(\d+)([dhm])$/);
  if (!match) {
    // Default to 7 days
    now.setDate(now.getDate() + 7);
    return now;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  if (unit === "d") {
    now.setDate(now.getDate() + value);
  } else if (unit === "h") {
    now.setHours(now.getHours() + value);
  } else if (unit === "m") {
    now.setMinutes(now.getMinutes() + value);
  }

  return now;
}

/**
 * Creates a new access and refresh token session for a user.
 */
export async function createSession(
  userId: string,
  deviceInfo?: string,
  ipAddress?: string
): Promise<SessionResult> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || !user.isActive) {
    throw new Error("User not found or is inactive");
  }

  const jti = nanoid();
  const refJti = nanoid();

  const accessToken = signAccessToken({
    sub: user.id,
    firebaseUid: user.firebaseUid,
    phone: user.phoneNumber,
    role: user.role,
    jti,
  });

  const rawRefreshToken = signRefreshToken({
    sub: user.id,
    jti: refJti,
  });

  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = getRefreshTokenExpiryDate();
  const tokenId = `ref_${nanoid(10)}`;

  await db.insert(refreshTokens).values({
    id: tokenId,
    userId: user.id,
    tokenHash,
    deviceInfo: deviceInfo || null,
    ipAddress: ipAddress || null,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    expiresAt,
  };
}

/**
 * Rotates a refresh token: revokes the old token, performs replay detection,
 * and issues a new pair of access/refresh tokens.
 */
export async function rotateRefreshToken(
  rawRefreshToken: string,
  deviceInfo?: string,
  ipAddress?: string
): Promise<SessionResult> {
  let decoded;
  try {
    decoded = verifyRefreshToken(rawRefreshToken);
  } catch (err) {
    throw new Error("Invalid or expired refresh token");
  }

  const tokenHash = hashToken(rawRefreshToken);

  const tokenRecord = await db.query.refreshTokens.findFirst({
    where: eq(refreshTokens.tokenHash, tokenHash),
  });

  if (!tokenRecord) {
    throw new Error("Refresh token record not found");
  }

  // Replay Attack Detection
  if (tokenRecord.revokedAt) {
    const graceWindowMs = 10000; // 10 seconds grace window for concurrent requests
    const timeSinceRevocation = Date.now() - tokenRecord.revokedAt.getTime();

    if (timeSinceRevocation <= graceWindowMs && tokenRecord.replacedByTokenId) {
      // Find the replacement token that was issued in place of this one
      const replacementToken = await db.query.refreshTokens.findFirst({
        where: eq(refreshTokens.id, tokenRecord.replacedByTokenId),
      });

      // If the replacement token exists and is valid, perform rotation on it
      if (replacementToken && replacementToken.expiresAt > new Date()) {
        const user = await db.query.users.findFirst({
          where: eq(users.id, tokenRecord.userId),
        });

        if (user && user.isActive) {
          // Issue new tokens
          const newJti = nanoid();
          const newRefJti = nanoid();

          const newAccessToken = signAccessToken({
            sub: user.id,
            firebaseUid: user.firebaseUid,
            phone: user.phoneNumber,
            role: user.role,
            jti: newJti,
          });

          const newRawRefreshToken = signRefreshToken({
            sub: user.id,
            jti: newRefJti,
          });

          const newHash = hashToken(newRawRefreshToken);
          const newExpiresAt = getRefreshTokenExpiryDate();
          const newRecordId = `ref_${nanoid(10)}`;

          // Transactionally revoke the replacement token and save the new token record
          await db.transaction(async (tx) => {
            await tx
              .update(refreshTokens)
              .set({
                revokedAt: new Date(),
                replacedByTokenId: newRecordId,
              })
              .where(eq(refreshTokens.id, replacementToken.id));

            await tx.insert(refreshTokens).values({
              id: newRecordId,
              userId: user.id,
              tokenHash: newHash,
              deviceInfo: deviceInfo || replacementToken.deviceInfo,
              ipAddress: ipAddress || replacementToken.ipAddress,
              expiresAt: newExpiresAt,
            });
          });

          console.log(`Grace period rotation handled. Rotated replacement token ${replacementToken.id} to ${newRecordId}.`);

          return {
            accessToken: newAccessToken,
            refreshToken: newRawRefreshToken,
            expiresAt: newExpiresAt,
          };
        }
      }
    }

    // Revoke all other active sessions for this user immediately
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, tokenRecord.userId));

    throw new Error("Security Alert: Reuse of rotated refresh token detected. All user sessions have been revoked.");
  }

  // Expiration Check
  if (tokenRecord.expiresAt < new Date()) {
    throw new Error("Refresh token has expired");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, tokenRecord.userId),
  });

  if (!user || !user.isActive) {
    throw new Error("User not found or is inactive");
  }

  // Issue new tokens
  const newJti = nanoid();
  const newRefJti = nanoid();

  const newAccessToken = signAccessToken({
    sub: user.id,
    firebaseUid: user.firebaseUid,
    phone: user.phoneNumber,
    role: user.role,
    jti: newJti,
  });

  const newRawRefreshToken = signRefreshToken({
    sub: user.id,
    jti: newRefJti,
  });

  const newHash = hashToken(newRawRefreshToken);
  const newExpiresAt = getRefreshTokenExpiryDate();
  const newRecordId = `ref_${nanoid(10)}`;

  // Update in a transaction
  await db.transaction(async (tx) => {
    // Revoke the old token and register the replacement ID
    await tx
      .update(refreshTokens)
      .set({
        revokedAt: new Date(),
        replacedByTokenId: newRecordId,
      })
      .where(eq(refreshTokens.id, tokenRecord.id));

    // Save the new token record
    await tx.insert(refreshTokens).values({
      id: newRecordId,
      userId: user.id,
      tokenHash: newHash,
      deviceInfo: deviceInfo || tokenRecord.deviceInfo,
      ipAddress: ipAddress || tokenRecord.ipAddress,
      expiresAt: newExpiresAt,
    });
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRawRefreshToken,
    expiresAt: newExpiresAt,
  };
}

/**
 * Revokes a single refresh token (e.g. for standard logout).
 */
export async function revokeRefreshToken(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, tokenHash));
}

/**
 * Revokes all sessions for a user (e.g. forced logout from all devices).
 */
export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.userId, userId));
}
