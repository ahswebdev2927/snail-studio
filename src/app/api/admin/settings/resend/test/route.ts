import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { sendResendEmail, getFromEmail } from "@/services/email/resend.service";
import { getResendTestEmailTemplate } from "@/services/email/templates/test-email.template";

/**
 * POST /api/admin/settings/resend/test - Sends a test email via Resend (Admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { test_recipient } = body;

    if (!test_recipient) {
      return NextResponse.json(
        { error: "Test recipient email is required" },
        { status: 400 }
      );
    }

    const fromEmail = getFromEmail();
    console.log(`Testing Resend connection... sending test mail to ${test_recipient} from ${fromEmail}`);

    const htmlContent = getResendTestEmailTemplate(fromEmail);
    const emailResult = await sendResendEmail({
      to: test_recipient.trim(),
      subject: "Test Email | Snail Studio Resend Service",
      html: htmlContent,
      templateName: "resend_test_email",
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: emailResult.error || "Resend connection check failed."
        },
        { status: 400 }
      );
    }

    if (emailResult.isBypassed) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Resend Sandbox/Dev Bypass Triggered",
          details: `The email was mock-delivered locally. Reason: ${emailResult.error || "Sandbox bypass / Dev mode restriction"}. Under Resend's free onboarding domain (onboarding@resend.dev), you can only send test emails to your verified account owner's email address.`
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Resend test email sent successfully to ${test_recipient}!`,
      messageId: emailResult.id,
    }, { status: 200 });

  } catch (error: any) {
    console.error("POST /api/admin/settings/resend/test error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
