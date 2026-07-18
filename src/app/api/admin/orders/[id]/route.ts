import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrderById, updateOrderStatus } from "@/services/checkout/order.service";
import { authorize } from "@/middleware/auth";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
  notes: z.string().max(500).optional().nullable(),
});

// GET /api/admin/orders/[id] - Fetch detailed order information (Admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Retrieve order using detailed service loader
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Also fetch associated payments
    const payments = await db.query.payments.findMany({
      where: (p, { eq }) => eq(p.orderId, orderId),
    });

    // Also fetch associated shipments with their events
    const shipments = await db.query.shipments.findMany({
      where: (s, { eq }) => eq(s.orderId, orderId),
      with: {
        events: {
          orderBy: (e, { desc }) => [desc(e.timestamp)],
        },
      },
    });

    // Fetch address change history
    const addressHistory = await db.query.orderAddressHistory.findMany({
      where: (ah, { eq }) => eq(ah.orderId, orderId),
      orderBy: (ah, { desc }) => [desc(ah.createdAt)],
    });

    return NextResponse.json({
      ...order,
      payments,
      shipments,
      addressHistory,
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/orders/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/orders/[id] - Update order status with log entry (Admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = patchSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status, notes } = result.data;

    // Check if order exists
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Sensitive Action Re-Authentication Check (Only for cancellation / refunding)
    if (status === "cancelled" || status === "refunded") {
      const { verifySensitiveAction } = await import("@/lib/auth/security");
      const securityCheck = await verifySensitiveAction(
        req,
        auth.user!,
        status === "cancelled" ? "cancel_order" : "refund_order",
        null
      );
      if (!securityCheck.verified) {
        return securityCheck.errorResponse!;
      }
    }

    // Update status and write status history log
    await updateOrderStatus(orderId, status, notes || undefined);

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const browser = req.headers.get("user-agent") || "Unknown";

    // Log to admin audit logs if sensitive status
    if (status === "cancelled" || status === "refunded") {
      const { logAdminAudit } = await import("@/lib/auth/security");
      await logAdminAudit({
        adminId: auth.user!.id,
        adminName: auth.user!.name || auth.user!.phoneNumber,
        action: status === "cancelled" ? "cancel_order" : "refund_order",
        targetUserId: order.userId,
        verificationStatus: "verified",
        ipAddress,
        browser,
      });

      // Send confirmation email
      const { sendMail } = await import("@/services/email/email.service");
      const { getPrivilegedActionEmailTemplate } = await import("@/services/email/templates/security.template");

      if (auth.user!.email) {
        const adminEmailHtml = getPrivilegedActionEmailTemplate(
          auth.user!.name || "Administrator",
          status === "cancelled" ? "Cancel Order" : "Refund Order",
          `Order ID: ${orderId}`,
          ipAddress,
          browser
        );
        await sendMail({
          to: auth.user!.email,
          subject: `[Security Alert] Successful Privileged Action - Snail Studio`,
          html: adminEmailHtml,
          templateName: "admin_privileged_action",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Order status successfully transitioned to ${status}`,
    }, { status: 200 });

  } catch (error: any) {
    console.error("PATCH /api/admin/orders/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
