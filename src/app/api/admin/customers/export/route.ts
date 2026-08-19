import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { verifySensitiveAction, logAdminAudit } from "@/lib/auth/security";
import { generateExportFile } from "@/services/crm/export/customer-export.service";
import { sendMail } from "@/services/email/email.service";
import { getPrivilegedActionEmailTemplate } from "@/services/email/templates/security.template";
import { logRouteHandler } from "@/lib/logger/request";

async function postHandler(req: NextRequest) {
  const reqLogger = (req as any).log;
  try {
    // 1. Authenticate and check Admin authorization
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const adminUser = auth.user!;

    // 2. Sensitive Action Re-authentication Check (OTP Verification)
    const securityCheck = await verifySensitiveAction(
      req,
      adminUser,
      "export_customers",
      null
    );

    if (!securityCheck.verified) {
      return securityCheck.errorResponse!;
    }

    // 3. Parse and Validate body configuration
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const browser = req.headers.get("user-agent") || "Unknown";

    // 4. Generate the export file content
    const { csvContent, customerCount, selectedFieldCount } = await generateExportFile(body);

    const today = new Date().toISOString().split("T")[0];
    const filename = `snail-studio-customers-${today}.csv`;

    // 5. Write to admin audit trail
    await logAdminAudit({
      adminId: adminUser.id,
      adminName: adminUser.name || adminUser.phoneNumber,
      action: `EXPORT_CUSTOMER_DATA (Count: ${customerCount}, Columns: ${selectedFieldCount}, Mode: ${body.selection?.mode})`,
      verificationStatus: "verified",
      ipAddress,
      browser,
    });

    // 6. Send Security Alert Confirmation Email to Active Administrator
    if (adminUser.email) {
      try {
        const detailsString = `Format: CSV, Customer Count: ${customerCount}, Selected Fields Count: ${selectedFieldCount}`;
        const adminEmailHtml = getPrivilegedActionEmailTemplate(
          adminUser.name || "Administrator",
          "Export Customer Database Profile Data",
          detailsString,
          ipAddress,
          browser
        );
        await sendMail({
          to: adminUser.email,
          subject: `[Security Alert] Successful Privileged Action - Snail Studio`,
          html: adminEmailHtml,
          templateName: "admin_privileged_action",
        });
      } catch (mailErr) {
        if (reqLogger) {
          reqLogger.error({ err: mailErr }, "Failed to send privileged export security email");
        } else {
          console.error("Failed to send privileged export security email:", mailErr);
        }
      }
    }

    // 7. Return download file response
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    if (reqLogger) {
      reqLogger.error({ err: error }, "POST /api/admin/customers/export error");
    } else {
      console.error("POST /api/admin/customers/export error:", error);
    }

    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: error.name === "ZodError" ? 400 : 500 }
    );
  }
}

export const POST = logRouteHandler(postHandler);
