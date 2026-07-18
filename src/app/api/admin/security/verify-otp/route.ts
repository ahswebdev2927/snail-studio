import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { verifySecurityOtp, logAdminAudit } from "@/lib/auth/security";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const adminUser = auth.user!;
    
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { otp } = body;

    if (!otp) {
      return NextResponse.json({ error: "OTP is required" }, { status: 400 });
    }

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const browser = req.headers.get("user-agent") || "Unknown";

    const isValid = await verifySecurityOtp(adminUser.id, otp);
    if (!isValid) {
      // Log failed audit log
      await logAdminAudit({
        adminId: adminUser.id,
        adminName: adminUser.name || adminUser.phoneNumber,
        action: "verify_otp",
        verificationStatus: "failed",
        ipAddress,
        browser,
      });

      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
    }

    // Success! Generate signed security session token
    const token = jwt.sign(
      { sub: adminUser.id, verifiedAt: Date.now() },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json(
      { success: true, message: "Security verification successful" },
      { status: 200 }
    );
    
    response.cookies.set("securitySession", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days (verification duration is verified on each request)
    });

    // Log successful audit log
    await logAdminAudit({
      adminId: adminUser.id,
      adminName: adminUser.name || adminUser.phoneNumber,
      action: "verify_otp",
      verificationStatus: "verified",
      ipAddress,
      browser,
    });

    return response;
  } catch (error: any) {
    console.error("verify-otp error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
