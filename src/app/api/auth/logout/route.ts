import { NextRequest, NextResponse } from "next/server";
import { revokeRefreshToken } from "@/lib/auth/refresh-token";
import { blacklistToken } from "@/lib/auth/blacklist";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get("accessToken")?.value;
    const refreshToken = req.cookies.get("refreshToken")?.value;

    // 1. Revoke the refresh token session in database if present
    if (refreshToken) {
      try {
        await revokeRefreshToken(refreshToken);
      } catch (err) {
        console.warn("Failed to revoke refresh token in DB during logout:", err);
      }
    }

    // 2. Blacklist the access token JTI if present
    if (accessToken) {
      try {
        const decoded = jwt.decode(accessToken) as jwt.JwtPayload;
        if (decoded && decoded.jti && decoded.exp) {
          // Expiry is in UNIX seconds, convert to Date object
          const expiresAt = new Date(decoded.exp * 1000);

          // Only blacklist if it hasn't expired yet
          if (expiresAt > new Date()) {
            await blacklistToken(decoded.jti, expiresAt);
          }
        }
      } catch (err) {
        console.warn("Failed to blacklist access token during logout:", err);
      }
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    // 3. Clear HttpOnly cookies
    response.cookies.set("accessToken", "", { path: "/", maxAge: 0 });
    response.cookies.set("refreshToken", "", { path: "/", maxAge: 0 });

    return response;
  } catch (error: any) {
    console.error("Logout API route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
