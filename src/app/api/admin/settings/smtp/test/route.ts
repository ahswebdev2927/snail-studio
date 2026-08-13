import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { verifySmtpConnection, sendMail, getSmtpConfig } from "@/services/email/email.service";
import { getTestEmailTemplate } from "@/services/email/templates/test-email.template";

const MASK_VALUE = "••••••••••••";

/**
 * POST /api/admin/settings/smtp/test - Verifies SMTP details and sends a test email (Admin only)
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

    const { smtp_host, smtp_port, smtp_user, smtp_password, test_recipient } = body;

    if (!test_recipient) {
      return NextResponse.json(
        { error: "Test recipient email is required" },
        { status: 400 }
      );
    }

    let host = smtp_host;
    let portStr = smtp_port;
    let user = smtp_user;
    let actualPassword = smtp_password;

    // If host/user are missing, load active configuration from server settings / env
    if (!host || !user) {
      const activeConfig = await getSmtpConfig();
      if (!activeConfig) {
        return NextResponse.json(
          { error: "No active SMTP configuration is set up on the server." },
          { status: 400 }
        );
      }
      host = activeConfig.host;
      portStr = String(activeConfig.port);
      user = activeConfig.user;
      actualPassword = activeConfig.pass;
    }

    // Resolve port number
    const portNum = parseInt(portStr, 10);
    if (isNaN(portNum)) {
      return NextResponse.json({ error: "SMTP port must be a valid number" }, { status: 400 });
    }

    // Resolve the actual password if we did receive a payload and it was masked
    if (smtp_host && (smtp_password === MASK_VALUE || !smtp_password)) {
      // Load from DB
      const dbRow = await db.query.systemSettings.findFirst({
        where: eq(systemSettings.key, "smtp_password"),
      });
      if (!dbRow) {
        return NextResponse.json(
          { error: "Password was masked but no saved SMTP password was found in database" },
          { status: 400 }
        );
      }
      actualPassword = dbRow.value;
    }

    const config = {
      host: host.trim(),
      port: portNum,
      user: user.trim(),
      pass: actualPassword,
    };

    console.log(`Testing SMTP connection to ${config.host}:${config.port} for user ${config.user}...`);

    // 1. Verify SMTP Connection
    const verification = await verifySmtpConnection(config);
    if (!verification.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Connection check failed. Verify host, port, and security rules.",
          details: verification.error 
        },
        { status: 400 }
      );
    }

    // 2. Send the test email
    const htmlContent = getTestEmailTemplate(config.user);
    const emailResult = await sendMail({
      to: test_recipient.trim(),
      subject: "Test Email | Snail Studio SMTP Service",
      html: htmlContent,
      templateName: "test_email",
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "SMTP connection verified, but failed to send test email.",
          details: emailResult.error 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `SMTP connection established and test email sent successfully to ${test_recipient}!`,
      logId: emailResult.logId,
    }, { status: 200 });

  } catch (error: any) {
    console.error("POST /api/admin/settings/smtp/test error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
