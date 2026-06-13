import { NextRequest, NextResponse } from "next/server";
import { rotateRefreshToken } from "@/lib/auth/refresh-token";

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get("refreshToken")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token is missing" },
        { status: 401 }
      );
    }

    const userAgent = req.headers.get("user-agent") || undefined;
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      undefined;

    let sessionResult;
    try {
      sessionResult = await rotateRefreshToken(
        refreshToken,
        userAgent,
        ipAddress
      );
    } catch (rotationError: any) {
      console.warn("Refresh token rotation failed:", rotationError.message);

      const response = NextResponse.json(
        { error: "Invalid or expired session", details: rotationError.message },
        { status: 401 }
      );

      // Clear cookies to prevent further retries of bad/revoked tokens
      response.cookies.set("accessToken", "", { path: "/", maxAge: 0 });
      response.cookies.set("refreshToken", "", { path: "/", maxAge: 0 });

      return response;
    }

    const { accessToken, refreshToken: newRefreshToken, expiresAt } = sessionResult;

    const response = NextResponse.json({
      success: true,
      message: "Token refreshed successfully",
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
    response.cookies.set("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: refreshTokenMaxAge,
    });

    return response;
  } catch (error: any) {
    console.error("Refresh API route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
