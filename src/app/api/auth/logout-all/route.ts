import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, verifyRefreshToken } from "@/lib/auth/jwt";
import { isBlacklisted, blacklistToken } from "@/lib/auth/blacklist";
import { revokeAllSessionsForUser } from "@/lib/auth/refresh-token";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get("accessToken")?.value;
    const refreshToken = req.cookies.get("refreshToken")?.value;

    let userId: string | null = null;

    // 1. Try to resolve userId from access token
    if (accessToken) {
      try {
        const decoded = verifyAccessToken(accessToken);
        const blacklisted = await isBlacklisted(decoded.jti);
        if (!blacklisted) {
          userId = decoded.sub;
        }
      } catch (err) {
        // Access token might be expired or invalid, we will fall back to refresh token
      }
    }

    // 2. If access token is invalid, fall back to the refresh token
    if (!userId && refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        userId = decoded.sub;
      } catch (err) {
        // Refresh token is also expired or invalid
      }
    }

    // If we still can't identify the user session, reject request
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or expired session" },
        { status: 401 }
      );
    }

    // 3. Revoke all refresh tokens for this user in the database
    await revokeAllSessionsForUser(userId);

    // 4. Blacklist current access token JTI if active
    if (accessToken) {
      try {
        const decoded = jwt.decode(accessToken) as jwt.JwtPayload;
        if (decoded && decoded.jti && decoded.exp) {
          const expiresAt = new Date(decoded.exp * 1000);

          if (expiresAt > new Date()) {
            await blacklistToken(decoded.jti, expiresAt);
          }
        }
      } catch (err) {
        console.warn("Failed to blacklist access token during logout-all:", err);
      }
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out from all devices successfully",
    });

    // 5. Clear cookies
    response.cookies.set("accessToken", "", { path: "/", maxAge: 0 });
    response.cookies.set("refreshToken", "", { path: "/", maxAge: 0 });

    return response;
  } catch (error: any) {
    console.error("Logout-all API route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
