import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, adminAuditLogs } from "@/db/schema";
import { authorize } from "@/middleware/auth";
import { desc, sql } from "drizzle-orm";

// GET /api/admin/users - List all users in the system (Admin only)
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { searchParams } = new URL(req.url);
    const roleParam = searchParams.get("role") || "";
    const searchParam = searchParams.get("q") || "";

    const conditions = [];

    if (roleParam === "admin" || roleParam === "customer") {
      conditions.push(sql`${users.role} = ${roleParam}`);
    }

    if (searchParam.trim()) {
      const searchVal = `%${searchParam.trim()}%`;
      conditions.push(
        sql`(${users.name} LIKE ${searchVal} OR ${users.phoneNumber} LIKE ${searchVal} OR ${users.email} LIKE ${searchVal})`
      );
    }

    const whereClause = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined;

    // Fetch all users with basic details
    const allUsers = await db.query.users.findMany({
      where: whereClause,
      orderBy: [desc(users.role), desc(users.createdAt)], // Admins first, then newest
    });

    // Strip sensitive fields
    const safeUsers = allUsers.map((u) => ({
      id: u.id,
      firebaseUid: u.firebaseUid,
      phoneNumber: u.phoneNumber,
      whatsappNumber: u.whatsappNumber,
      email: u.email,
      name: u.name,
      image: u.image,
      role: u.role,
      phoneVerified: u.phoneVerified,
      isActive: u.isActive,
      isStoreOwner: u.isStoreOwner,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }));

    // Fetch audit logs summary or detail if requested
    const auditLogs = await db.query.adminAuditLogs.findMany({
      orderBy: [desc(adminAuditLogs.timestamp)],
      limit: 100, // retrieve latest 100 logs
    });

    return NextResponse.json({
      users: safeUsers,
      auditLogs,
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
