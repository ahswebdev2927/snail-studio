import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, adminAuditLogs, emailLogs } from "@/db/schema";
import { authorize } from "@/middleware/auth";
import { verifySensitiveAction, logAdminAudit } from "@/lib/auth/security";
import { sendMail } from "@/services/email/email.service";
import { getPrivilegedActionEmailTemplate } from "@/services/email/templates/security.template";
import { desc } from "drizzle-orm";

// GET /api/admin/export - Securely export customer data or logs (Admin only, requires OTP)
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const adminUser = auth.user!;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "customers";

    if (type !== "customers" && type !== "logs") {
      return NextResponse.json(
        { error: "Invalid export type. Must be 'customers' or 'logs'." },
        { status: 400 }
      );
    }

    // 1. Re-authentication verification check
    const securityCheck = await verifySensitiveAction(
      req,
      adminUser,
      type === "customers" ? "export_customers" : "export_logs",
      null
    );

    if (!securityCheck.verified) {
      return securityCheck.errorResponse!;
    }

    let payload: any = {};
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const browser = req.headers.get("user-agent") || "Unknown";

    // 2. Query data based on type
    if (type === "customers") {
      const allUsers = await db.query.users.findMany({
        orderBy: [desc(users.createdAt)],
      });
      payload = allUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phoneNumber: u.phoneNumber,
        whatsappNumber: u.whatsappNumber,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
      }));
    } else {
      const adminLogs = await db.query.adminAuditLogs.findMany({
        orderBy: [desc(adminAuditLogs.timestamp)],
        limit: 1000,
      });
      const mailLogs = await db.query.emailLogs.findMany({
        orderBy: [desc(emailLogs.sentAt)],
        limit: 1000,
      });
      payload = {
        adminAuditLogs: adminLogs,
        emailLogs: mailLogs,
      };
    }

    // 3. Write to audit trail
    await logAdminAudit({
      adminId: adminUser.id,
      adminName: adminUser.name || adminUser.phoneNumber,
      action: type === "customers" ? "export_customers" : "export_logs",
      verificationStatus: "verified",
      ipAddress,
      browser,
    });

    // 4. Send Confirmation Email to Acting Admin
    if (adminUser.email) {
      const adminEmailHtml = getPrivilegedActionEmailTemplate(
        adminUser.name || "Administrator",
        type === "customers" ? "Export Customer Data" : "Export Security/Email Logs",
        `Export Type: ${type}`,
        ipAddress,
        browser
      );
      await sendMail({
        to: adminUser.email,
        subject: `[Security Alert] Successful Privileged Action - Snail Studio`,
        html: adminEmailHtml,
        templateName: "admin_privileged_action",
      });
    }

    // Return the export file response
    return NextResponse.json(payload, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/export error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
