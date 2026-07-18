import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { verifySensitiveAction, logAdminAudit } from "@/lib/auth/security";
import { sendMail } from "@/services/email/email.service";
import { 
  getPrivilegedActionEmailTemplate, 
  getRoleChangeEmailTemplate 
} from "@/services/email/templates/security.template";

// POST /api/admin/users/[id]/role - Modify user role (Admin only, requires OTP)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: targetUserId } = await params;
    const adminUser = auth.user!;

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { role: newRole } = body;
    if (newRole !== "admin" && newRole !== "customer") {
      return NextResponse.json(
        { error: "Invalid role value. Must be 'admin' or 'customer'." },
        { status: 400 }
      );
    }

    // 1. Check if target user exists
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If role is unchanged, return success directly
    if (targetUser.role === newRole) {
      return NextResponse.json(
        { success: true, message: "User already has the specified role." },
        { status: 200 }
      );
    }

    // 2. Security Re-Authentication Check (Requires OTP verification)
    const securityCheck = await verifySensitiveAction(
      req,
      adminUser,
      newRole === "admin" ? "promote_admin" : "demote_admin",
      targetUserId
    );

    if (!securityCheck.verified) {
      return securityCheck.errorResponse!;
    }

    // 3. Perform Role Change validations
    if (newRole === "admin") {
      const totalLimit = parseInt(process.env.TOTAL_ADMINS || "5", 10);
      const allAdmins = await db.query.users.findMany({
        where: or(eq(users.role, "admin"), eq(users.isStoreOwner, true)),
      });

      if (allAdmins.length >= totalLimit) {
        await logAdminAudit({
          adminId: adminUser.id,
          adminName: adminUser.name || adminUser.phoneNumber,
          action: "promote_admin",
          targetUserId,
          previousRole: targetUser.role,
          newRole,
          verificationStatus: "failed",
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
          browser: req.headers.get("user-agent") || "Unknown",
        });

        return NextResponse.json(
          { error: `Cannot promote user: Maximum limit of ${totalLimit} administrators has been reached.` },
          { status: 400 }
        );
      }
    } else if (newRole === "customer") {
      // A. Owner Protection: cannot demote store owner
      if (targetUser.isStoreOwner) {
        await logAdminAudit({
          adminId: adminUser.id,
          adminName: adminUser.name || adminUser.phoneNumber,
          action: "demote_admin",
          targetUserId,
          previousRole: targetUser.role,
          newRole,
          verificationStatus: "failed",
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
          browser: req.headers.get("user-agent") || "Unknown",
        });

        return NextResponse.json(
          { error: "Access Denied: The Store Owner cannot be demoted to a customer." },
          { status: 400 }
        );
      }

      // B. Lockout Protection: cannot demote last active admin
      const activeAdmins = await db.query.users.findMany({
        where: and(eq(users.role, "admin"), eq(users.isActive, true)),
      });

      if (activeAdmins.length === 1 && activeAdmins[0].id === targetUserId) {
        await logAdminAudit({
          adminId: adminUser.id,
          adminName: adminUser.name || adminUser.phoneNumber,
          action: "demote_admin",
          targetUserId,
          previousRole: targetUser.role,
          newRole,
          verificationStatus: "failed",
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
          browser: req.headers.get("user-agent") || "Unknown",
        });

        return NextResponse.json(
          { error: "Access Denied: Cannot demote the last active administrator." },
          { status: 400 }
        );
      }
    }

    const previousRole = targetUser.role;

    // 4. Update the user role in the DB
    await db
      .update(users)
      .set({
        role: newRole,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetUserId));

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const browser = req.headers.get("user-agent") || "Unknown";

    // 5. Write to admin audit logs
    await logAdminAudit({
      adminId: adminUser.id,
      adminName: adminUser.name || adminUser.phoneNumber,
      action: newRole === "admin" ? "promote_admin" : "demote_admin",
      targetUserId,
      previousRole,
      newRole,
      verificationStatus: "verified",
      ipAddress,
      browser,
    });

    // 6. Send Notification Emails (SMTP fallback handles mock dev)
    // A. Email to Acting Admin
    if (adminUser.email) {
      const adminEmailHtml = getPrivilegedActionEmailTemplate(
        adminUser.name || "Administrator",
        newRole === "admin" ? "Promote User to Admin" : "Demote Admin to Customer",
        targetUser.name || targetUser.phoneNumber,
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

    // B. Email to Affected User
    if (targetUser.email) {
      const userEmailHtml = getRoleChangeEmailTemplate(
        targetUser.name || "User",
        previousRole,
        newRole
      );
      await sendMail({
        to: targetUser.email,
        subject: `Account Access Rights Updated - Snail Studio`,
        html: userEmailHtml,
        templateName: "user_role_updated",
      });
    }

    return NextResponse.json(
      { success: true, message: `User successfully ${newRole === "admin" ? "promoted to Admin" : "demoted to Customer"}.` },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("POST /api/admin/users/[id]/role error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
