import { db } from "@/db";
import { returnRequests, shipmentAuditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PaymentResponsibility } from "./types";
import { SessionUser } from "@/lib/auth/session";
import { nanoid } from "nanoid";
import {
  notifyReturnApproved,
  notifyReplacementApproved,
  notifyReturnRejected,
  notifyReplacementRejected,
} from "./notifications";

export interface ReviewReturnRequestOptions {
  requestId: string;
  action: "APPROVE" | "REJECT";
  paymentResponsibility?: PaymentResponsibility;
  paymentAmount?: number;
  adminNotes?: string;
  adminUser: SessionUser;
}

export interface ReviewReturnRequestResult {
  success: boolean;
  error?: string;
  status?: number;
  returnRequest?: any;
}

/**
 * Executes an admin review (approval or rejection) on a pending return request.
 */
export async function reviewReturnRequest(
  options: ReviewReturnRequestOptions
): Promise<ReviewReturnRequestResult> {
  const { requestId, action, paymentResponsibility, paymentAmount, adminNotes, adminUser } = options;

  const existing = await db.query.returnRequests.findFirst({
    where: eq(returnRequests.id, requestId),
  });

  if (!existing) {
    return { success: false, error: "Return request not found", status: 404 };
  }

  if (existing.status !== "PENDING_REVIEW") {
    return {
      success: false,
      error: `Return request cannot be modified because it is currently ${existing.status.replace(/_/g, " ")}.`,
      status: 400,
    };
  }

  const now = new Date();

  if (action === "APPROVE") {
    if (!paymentResponsibility || !["NONE", "CUSTOMER_PAYS", "STORE_PAYS"].includes(paymentResponsibility)) {
      return {
        success: false,
        error: "Payment responsibility selection is required to approve return request",
        status: 400,
      };
    }

    const paymentStatus = paymentResponsibility === "NONE" ? "NOT_REQUIRED" : "PENDING";

    const updates = {
      status: "APPROVED" as const,
      reviewedBy: adminUser.id,
      reviewedAt: now,
      paymentResponsibility,
      paymentAmount: paymentResponsibility === "NONE" ? 0 : (paymentAmount ?? existing.paymentAmount ?? 0),
      paymentStatus: paymentStatus as "NOT_REQUIRED" | "PENDING",
      adminNotes: adminNotes ? adminNotes.trim() : null,
      updatedAt: now,
    };

    await db.update(returnRequests).set(updates).where(eq(returnRequests.id, requestId));

    const auditAction = existing.type === "REPLACEMENT" ? "REPLACEMENT_APPROVED" : "RETURN_APPROVED";

    await db.insert(shipmentAuditLogs).values({
      id: `log_${nanoid(12)}`,
      shipmentId: null,
      orderId: existing.orderId,
      adminId: adminUser.id,
      adminName: adminUser.name || adminUser.phoneNumber || "Admin",
      action: auditAction,
      previousState: JSON.stringify({
        status: existing.status,
        paymentResponsibility: existing.paymentResponsibility,
      }),
      newState: JSON.stringify({
        status: updates.status,
        paymentResponsibility: updates.paymentResponsibility,
        adminNotes: updates.adminNotes,
      }),
      notes: updates.adminNotes || `${existing.type === "REPLACEMENT" ? "Replacement" : "Return"} request approved with payment responsibility: ${paymentResponsibility}`,
    });

    // Trigger Notification
    const payload = {
      id: existing.id,
      orderId: existing.orderId,
      customerId: existing.customerId,
      paymentResponsibility: updates.paymentResponsibility,
    };
    if (existing.type === "REPLACEMENT") {
      await notifyReplacementApproved(payload);
    } else {
      await notifyReturnApproved(payload);
    }

    return {
      success: true,
      returnRequest: {
        ...existing,
        ...updates,
      },
    };
  } else if (action === "REJECT") {
    const trimmedNotes = adminNotes ? adminNotes.trim() : "";
    if (!trimmedNotes) {
      return {
        success: false,
        error: "Admin rejection notes are required when rejecting a return request",
        status: 400,
      };
    }

    const updates = {
      status: "REJECTED" as const,
      reviewedBy: adminUser.id,
      reviewedAt: now,
      adminNotes: trimmedNotes,
      updatedAt: now,
    };

    await db.update(returnRequests).set(updates).where(eq(returnRequests.id, requestId));

    const auditAction = existing.type === "REPLACEMENT" ? "REPLACEMENT_REJECTED" : "RETURN_REJECTED";

    await db.insert(shipmentAuditLogs).values({
      id: `log_${nanoid(12)}`,
      shipmentId: null,
      orderId: existing.orderId,
      adminId: adminUser.id,
      adminName: adminUser.name || adminUser.phoneNumber || "Admin",
      action: auditAction,
      previousState: JSON.stringify({
        status: existing.status,
      }),
      newState: JSON.stringify({
        status: updates.status,
        adminNotes: updates.adminNotes,
      }),
      notes: updates.adminNotes,
    });

    // Trigger Notification
    const payload = {
      id: existing.id,
      orderId: existing.orderId,
      customerId: existing.customerId,
      adminNotes: updates.adminNotes,
    };
    if (existing.type === "REPLACEMENT") {
      await notifyReplacementRejected(payload);
    } else {
      await notifyReturnRejected(payload);
    }

    return {
      success: true,
      returnRequest: {
        ...existing,
        ...updates,
      },
    };
  }

  return { success: false, error: "Invalid action specified", status: 400 };
}
