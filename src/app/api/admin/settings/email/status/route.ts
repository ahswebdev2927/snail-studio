import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { getSmtpConfig } from "@/services/email/email.service";
import { getFromEmail } from "@/services/email/resend.service";

/**
 * GET /api/admin/settings/email/status - Fetch resolved SMTP and Resend configurations (Admin only, Read-Only)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const smtpConfig = await getSmtpConfig();
    const resendFromEmail = getFromEmail();
    
    // Check if RESEND_API_KEY is defined and is not the default mock key
    const hasResendKey = !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "re_L8JTJdTa_CMRjPrvgVgePYbC2JaQuqK9f";

    return NextResponse.json({
      smtp: {
        host: smtpConfig?.host || "Not Configured (Developer-only settings)",
        port: smtpConfig?.port || 465,
        user: smtpConfig?.user || "Not Configured (Developer-only settings)",
        isConfigured: !!smtpConfig,
      },
      resend: {
        fromEmail: resendFromEmail,
        isConfigured: hasResendKey,
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/admin/settings/email/status error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
