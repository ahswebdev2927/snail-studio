import { db } from "@/db";
import { securityOtps, adminAuditLogs, systemSettings, users } from "@/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { sendMail } from "@/services/email/email.service";
import { getOtpEmailTemplate } from "@/services/email/templates/security.template";
import { SessionUser } from "./session";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
if (!ACCESS_SECRET) {
  throw new Error("JWT secrets are not configured in environment variables.");
}

/**
 * Generates a 6-digit random OTP, saves it to security_otps, and sends it via email.
 */
export async function generateAndSendSecurityOtp(userId: string, email: string): Promise<string> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

  // Save to DB
  await db.insert(securityOtps).values({
    id: `otp_${nanoid(12)}`,
    userId,
    otp,
    expiresAt,
    createdAt: new Date(),
  });

  // Send Email
  const html = getOtpEmailTemplate(otp);
  await sendMail({
    to: email,
    subject: "Security Verification Code - Snail Studio",
    html,
    templateName: "security_otp",
  });

  return otp;
}

/**
 * Validates the OTP entered by the user.
 */
export async function verifySecurityOtp(userId: string, otpCode: string): Promise<boolean> {
  // Find the latest active OTP for the user
  const latestOtp = await db.query.securityOtps.findFirst({
    where: and(
      eq(securityOtps.userId, userId),
      eq(securityOtps.otp, otpCode),
      gt(securityOtps.expiresAt, new Date())
    ),
    orderBy: [desc(securityOtps.createdAt)],
  });

  if (!latestOtp) {
    return false;
  }

  // Delete OTP after verification to prevent reuse
  await db.delete(securityOtps).where(eq(securityOtps.id, latestOtp.id));
  return true;
}

/**
 * Helper to write a record to admin_audit_logs.
 */
export async function logAdminAudit(params: {
  adminId: string;
  adminName: string;
  action: string;
  targetUserId?: string | null;
  previousRole?: string | null;
  newRole?: string | null;
  ipAddress?: string | null;
  browser?: string | null;
  verificationMethod?: string;
  verificationStatus: "verified" | "failed" | "pending";
}) {
  try {
    await db.insert(adminAuditLogs).values({
      id: `log_${nanoid(12)}`,
      adminId: params.adminId,
      adminName: params.adminName,
      action: params.action,
      targetUserId: params.targetUserId || null,
      previousRole: params.previousRole || null,
      newRole: params.newRole || null,
      ipAddress: params.ipAddress || null,
      browser: params.browser || null,
      verificationMethod: params.verificationMethod || "email_otp",
      verificationStatus: params.verificationStatus,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Failed to write admin audit log:", error);
  }
}

/**
 * Verifies if the admin has a valid verification session (Sudo Mode).
 * If invalid or expired, sends a new OTP and returns a 403 Forbidden with verificationRequired: true.
 */
export async function verifySensitiveAction(
  req: NextRequest,
  adminUser: SessionUser,
  actionName: string,
  targetUserId?: string | null
): Promise<{ verified: boolean; errorResponse?: NextResponse }> {
  const securitySessionToken = req.cookies.get("securitySession")?.value;
  const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const browser = req.headers.get("user-agent") || "Unknown";

  let isVerified = false;

  if (securitySessionToken) {
    try {
      const decoded = jwt.verify(securitySessionToken, ACCESS_SECRET!) as any;
      
      // Ensure the verification cookie belongs to the logged-in admin
      if (decoded.sub === adminUser.id && decoded.verifiedAt) {
        // Fetch re-authentication timeout settings
        const timeoutRow = await db.query.systemSettings.findFirst({
          where: eq(systemSettings.key, "security_verification_timeout_minutes"),
        });
        const timeoutMinutes = timeoutRow ? parseInt(timeoutRow.value, 10) || 15 : 15;
        
        const elapsedMs = Date.now() - decoded.verifiedAt;
        if (elapsedMs < timeoutMinutes * 60 * 1000) {
          isVerified = true;
        }
      }
    } catch (err) {
      console.warn("Invalid security session cookie signature");
    }
  }

  if (isVerified) {
    return { verified: true };
  }

  // Not verified: generate and send OTP
  let otpCode: string | undefined;
  if (adminUser.email) {
    try {
      otpCode = await generateAndSendSecurityOtp(adminUser.id, adminUser.email);

      if (process.env.NODE_ENV === "development") {
        console.log(`\n🔑 [DEV ONLY] SECURITY OTP GENERATED FOR ${adminUser.email}: ${otpCode}\n`);
      }
      
      // Log pending verification audit
      await logAdminAudit({
        adminId: adminUser.id,
        adminName: adminUser.name || adminUser.phoneNumber,
        action: actionName,
        targetUserId,
        verificationStatus: "pending",
        ipAddress,
        browser,
      });
    } catch (otpErr) {
      console.error("Failed to send verification OTP:", otpErr);
    }
  } else {
    console.error("Admin user does not have an email address configured.");
  }

  return {
    verified: false,
    errorResponse: NextResponse.json(
      { 
        verificationRequired: true, 
        message: "This sensitive action requires email OTP re-authentication.",
        action: actionName,
        devOtp: process.env.NODE_ENV === "development" ? otpCode : undefined
      },
      { status: 403 }
    ),
  };
}
