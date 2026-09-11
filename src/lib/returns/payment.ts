import { db } from "@/db";
import { returnRequests, shipmentAuditLogs, payments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { PaymentMethod } from "./types";
import { SessionUser } from "@/lib/auth/session";
import { nanoid } from "nanoid";
import { getPaymentProvider } from "@/lib/payments/payment-factory";

export interface RecordReturnPaymentOptions {
  requestId: string;
  paymentAmount: number; // stored in paise / INR subunit
  paymentMethod: PaymentMethod;
  paymentReference: string;
  paymentNotes?: string;
  adminUser: SessionUser;
}

export interface RecordReturnPaymentResult {
  success: boolean;
  error?: string;
  status?: number;
  returnRequest?: any;
}

/**
 * Records an external payment for a return or replacement request.
 * Sets paymentStatus to PAID, logs transaction details, and creates an audit entry.
 */
export async function recordReturnPayment(
  options: RecordReturnPaymentOptions
): Promise<RecordReturnPaymentResult> {
  const { requestId, paymentAmount, paymentMethod, paymentReference, paymentNotes, adminUser } = options;

  const existing = await db.query.returnRequests.findFirst({
    where: eq(returnRequests.id, requestId),
  });

  if (!existing) {
    return { success: false, error: "Return or replacement request not found", status: 404 };
  }

  if (existing.status === "REJECTED" || existing.status === "CANCELLED") {
    return {
      success: false,
      error: `Cannot record payment for a request with status ${existing.status}.`,
      status: 400,
    };
  }

  if (typeof paymentAmount !== "number" || paymentAmount <= 0) {
    return {
      success: false,
      error: "Payment amount must be greater than zero.",
      status: 400,
    };
  }

  if (!paymentReference || !paymentReference.trim()) {
    return {
      success: false,
      error: "Payment reference / transaction ID is required.",
      status: 400,
    };
  }

  const now = new Date();
  const updates = {
    paymentStatus: "PAID" as const,
    paymentAmount,
    paymentMethod,
    paymentReference: paymentReference.trim(),
    paymentNotes: paymentNotes ? paymentNotes.trim() : null,
    paidAt: now,
    recordedBy: adminUser.id,
    updatedAt: now,
  };

  await db.update(returnRequests).set(updates).where(eq(returnRequests.id, requestId));

  const action = existing.type === "RETURN" ? "RETURN_PAYMENT_RECORDED" : "REPLACEMENT_PAYMENT_RECORDED";

  await db.insert(shipmentAuditLogs).values({
    id: `log_${nanoid(12)}`,
    shipmentId: null,
    orderId: existing.orderId,
    adminId: adminUser.id,
    adminName: adminUser.name || adminUser.phoneNumber || "Admin",
    action,
    previousState: JSON.stringify({
      paymentStatus: existing.paymentStatus,
      paymentAmount: existing.paymentAmount,
    }),
    newState: JSON.stringify({
      paymentStatus: updates.paymentStatus,
      paymentAmount: updates.paymentAmount,
      paymentMethod: updates.paymentMethod,
      paymentReference: updates.paymentReference,
    }),
    notes: `Payment of ₹${(paymentAmount / 100).toFixed(2)} recorded via ${paymentMethod} (Ref: ${paymentReference.trim()}).`,
  });

  return {
    success: true,
    returnRequest: {
      ...existing,
      ...updates,
    },
  };
}

export interface VerifyReturnOnlinePaymentOptions {
  requestId: string;
  paymentId: string;
  gatewayOrderId: string;
  signature?: string;
  userId?: string;
}

/**
 * Verifies an online Razorpay payment for a return or replacement request.
 * Sets paymentStatus to PAID, updates transaction records, and logs audit entry.
 */
export async function verifyAndProcessReturnOnlinePayment(
  options: VerifyReturnOnlinePaymentOptions
) {
  const { requestId, paymentId, gatewayOrderId, signature, userId } = options;

  const existing = await db.query.returnRequests.findFirst({
    where: eq(returnRequests.id, requestId),
  });

  if (!existing) {
    return { success: false, error: "Return or replacement request not found", status: 404 };
  }

  if (existing.paymentStatus === "PAID") {
    return { success: true, message: "Payment already recorded as PAID", returnRequest: existing };
  }

  // Find pending payment record matching gatewayOrderId
  const paymentRecord = await db.query.payments.findFirst({
    where: and(
      eq(payments.orderId, existing.orderId),
      eq(payments.gatewayTransactionId, gatewayOrderId),
      eq(payments.status, "pending")
    ),
  });

  if (!paymentRecord) {
    return { success: false, error: "Pending payment record not found for this transaction", status: 404 };
  }

  // Verify payment with provider
  const provider = getPaymentProvider();
  const verification = await provider.verifyPayment({
    paymentId,
    orderId: existing.orderId,
    gatewayOrderId,
    signature,
  });

  if (!verification.success) {
    return { success: false, error: "Payment verification failed with provider", status: 400 };
  }

  // Update payment record to succeeded
  await db
    .update(payments)
    .set({
      status: "succeeded",
      gatewayTransactionId: paymentId,
    })
    .where(eq(payments.id, paymentRecord.id));

  // Update return request record
  const now = new Date();
  const updates = {
    paymentStatus: "PAID" as const,
    paymentAmount: paymentRecord.amount,
    paymentMethod: "Razorpay" as const,
    paymentReference: paymentId,
    paidAt: now,
    updatedAt: now,
  };

  await db.update(returnRequests).set(updates).where(eq(returnRequests.id, requestId));

  const action = existing.type === "RETURN" ? "RETURN_PAYMENT_RECORDED" : "REPLACEMENT_PAYMENT_RECORDED";

  await db.insert(shipmentAuditLogs).values({
    id: `log_${nanoid(12)}`,
    shipmentId: null,
    orderId: existing.orderId,
    adminId: userId || existing.customerId,
    adminName: "Razorpay Gateway",
    action,
    previousState: JSON.stringify({
      paymentStatus: existing.paymentStatus,
      paymentAmount: existing.paymentAmount,
    }),
    newState: JSON.stringify({
      paymentStatus: updates.paymentStatus,
      paymentAmount: updates.paymentAmount,
      paymentMethod: updates.paymentMethod,
      paymentReference: updates.paymentReference,
    }),
    notes: `Online payment of ₹${(paymentRecord.amount / 100).toFixed(2)} completed via Razorpay (Payment ID: ${paymentId}).`,
  });

  return {
    success: true,
    message: "Payment captured successfully.",
    returnRequest: {
      ...existing,
      ...updates,
    },
  };
}

