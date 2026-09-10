import { db } from "@/db";
import { returnRequests, users, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { triggerAdminNotification } from "@/services/notifications/notification-service";
import { sendMail } from "@/services/email/email.service";

// In-memory set for deduplicating notification triggers within session/process runtime
const processedNotificationKeys = new Set<string>();

/**
 * Generates a deduplication key for a request ID and notification event type.
 */
function getDedupeKey(requestId: string, eventType: string): string {
  return `${requestId}:${eventType}`;
}

/**
 * Checks whether a notification event has already been processed for a request.
 */
export function hasNotificationBeenSent(requestId: string, eventType: string): boolean {
  return processedNotificationKeys.has(getDedupeKey(requestId, eventType));
}

/**
 * Clears deduplication keys (useful for testing).
 */
export function clearNotificationDedupeCache(): void {
  processedNotificationKeys.clear();
}

/**
 * Fetches customer contact details associated with a return/replacement request.
 */
async function getCustomerDetails(customerId: string) {
  try {
    const customer = await db.query.users.findFirst({
      where: eq(users.id, customerId),
    });
    return customer;
  } catch (err) {
    console.error("Failed to fetch customer details for return notification:", err);
    return null;
  }
}

/**
 * Helper to dispatch notification to admin and customer with duplicate prevention.
 */
async function dispatchReturnNotification(options: {
  requestId: string;
  orderId: string;
  customerId: string;
  eventType: string;
  adminTitle: string;
  adminMessage: string;
  customerSubject: string;
  customerHtml: string;
  priority?: "low" | "medium" | "high" | "critical";
}) {
  const {
    requestId,
    orderId,
    customerId,
    eventType,
    adminTitle,
    adminMessage,
    customerSubject,
    customerHtml,
    priority = "medium",
  } = options;

  const dedupeKey = getDedupeKey(requestId, eventType);
  if (processedNotificationKeys.has(dedupeKey)) {
    return { success: false, duplicate: true };
  }

  // Mark as sent before executing to prevent race conditions
  processedNotificationKeys.add(dedupeKey);

  // 1. Dispatch Admin System Notification (In-App, SSE, Email, FCM)
  try {
    await triggerAdminNotification({
      category: "orders",
      title: adminTitle,
      message: adminMessage,
      priority,
      data: {
        action: eventType,
        entityType: "return_request",
        entityId: requestId,
        orderId,
        customerId,
      },
    });
  } catch (err) {
    console.error(`Failed to trigger admin notification for ${eventType}:`, err);
  }

  // 2. Dispatch Customer Email Notification if email is available
  try {
    const customer = await getCustomerDetails(customerId);
    if (customer && customer.email) {
      await sendMail({
        to: customer.email,
        subject: customerSubject,
        html: customerHtml,
        templateName: eventType.toLowerCase(),
      });
    }
  } catch (err) {
    console.error(`Failed to send customer email notification for ${eventType}:`, err);
  }

  return { success: true, duplicate: false };
}

// ---------------------------------------------------------------------------
// Specific Return Event Triggers
// ---------------------------------------------------------------------------

export async function notifyReturnRequestReceived(request: {
  id: string;
  orderId: string;
  customerId: string;
  reason?: string | null;
}) {
  return dispatchReturnNotification({
    requestId: request.id,
    orderId: request.orderId,
    customerId: request.customerId,
    eventType: "RETURN_REQUEST_RECEIVED",
    adminTitle: "New Return Request Received",
    adminMessage: `A return request (${request.id}) has been submitted for order #${request.orderId}. Reason: ${request.reason || "Not specified"}.`,
    customerSubject: `[Snail Studio] Return Request Received (Order #${request.orderId})`,
    customerHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #AC5429;">Return Request Received</h2>
        <p>We have received your return request for Order <strong>#${request.orderId}</strong>.</p>
        <p>Our team is currently reviewing your request. You will receive an update as soon as it has been processed.</p>
        <p>Request ID: <code>${request.id}</code></p>
      </div>
    `,
  });
}

export async function notifyReturnApproved(request: {
  id: string;
  orderId: string;
  customerId: string;
  paymentResponsibility?: string | null;
}) {
  const paymentInfo =
    request.paymentResponsibility === "CUSTOMER_PAYS"
      ? " Please complete return shipping payment as instructed."
      : "";

  return dispatchReturnNotification({
    requestId: request.id,
    orderId: request.orderId,
    customerId: request.customerId,
    eventType: "RETURN_APPROVED",
    adminTitle: "Return Request Approved",
    adminMessage: `Return request ${request.id} for order #${request.orderId} was approved.`,
    customerSubject: `[Snail Studio] Return Request Approved (Order #${request.orderId})`,
    customerHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4CAF50;">Return Request Approved</h2>
        <p>Good news! Your return request for Order <strong>#${request.orderId}</strong> has been approved.${paymentInfo}</p>
        <p>Our team will initiate the pickup process shortly.</p>
      </div>
    `,
  });
}

export async function notifyReturnRejected(request: {
  id: string;
  orderId: string;
  customerId: string;
  adminNotes?: string | null;
}) {
  return dispatchReturnNotification({
    requestId: request.id,
    orderId: request.orderId,
    customerId: request.customerId,
    eventType: "RETURN_REJECTED",
    adminTitle: "Return Request Rejected",
    adminMessage: `Return request ${request.id} for order #${request.orderId} was rejected. Notes: ${request.adminNotes || "N/A"}.`,
    customerSubject: `[Snail Studio] Update on Return Request (Order #${request.orderId})`,
    customerHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #d32f2f;">Return Request Update</h2>
        <p>Your return request for Order <strong>#${request.orderId}</strong> could not be approved at this time.</p>
        ${request.adminNotes ? `<p><strong>Reason / Notes:</strong> ${request.adminNotes}</p>` : ""}
        <p>If you have any questions, please reach out to customer support.</p>
      </div>
    `,
  });
}

export async function notifyReturnPickupCreated(request: {
  id: string;
  orderId: string;
  customerId: string;
  waybill?: string | null;
}) {
  return dispatchReturnNotification({
    requestId: request.id,
    orderId: request.orderId,
    customerId: request.customerId,
    eventType: "RETURN_PICKUP_CREATED",
    adminTitle: "Reverse Pickup Created",
    adminMessage: `Reverse pickup created for return request ${request.id} (Order #${request.orderId}). AWB: ${request.waybill || "Pending"}.`,
    customerSubject: `[Snail Studio] Reverse Pickup Scheduled (Order #${request.orderId})`,
    customerHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #AC5429;">Reverse Pickup Scheduled</h2>
        <p>A pickup has been scheduled for your returned item for Order <strong>#${request.orderId}</strong>.</p>
        ${request.waybill ? `<p>Tracking AWB: <strong>${request.waybill}</strong></p>` : ""}
        <p>Please keep the item packaged and ready for the courier partner.</p>
      </div>
    `,
  });
}

export async function notifyReturnReceived(request: {
  id: string;
  orderId: string;
  customerId: string;
}) {
  return dispatchReturnNotification({
    requestId: request.id,
    orderId: request.orderId,
    customerId: request.customerId,
    eventType: "RETURN_RECEIVED",
    adminTitle: "Return Received at Warehouse",
    adminMessage: `Returned item for request ${request.id} (Order #${request.orderId}) has been received at the warehouse.`,
    customerSubject: `[Snail Studio] Returned Item Received (Order #${request.orderId})`,
    customerHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #AC5429;">Return Item Received</h2>
        <p>We have received your returned item for Order <strong>#${request.orderId}</strong> at our warehouse.</p>
        <p>Our team is conducting final checks before completing the return.</p>
      </div>
    `,
  });
}

export async function notifyReturnCompleted(request: {
  id: string;
  orderId: string;
  customerId: string;
}) {
  return dispatchReturnNotification({
    requestId: request.id,
    orderId: request.orderId,
    customerId: request.customerId,
    eventType: "RETURN_COMPLETED",
    adminTitle: "Return Request Completed",
    adminMessage: `Return request ${request.id} for order #${request.orderId} is now marked COMPLETED.`,
    customerSubject: `[Snail Studio] Return Process Completed (Order #${request.orderId})`,
    customerHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4CAF50;">Return Process Completed</h2>
        <p>Your return request for Order <strong>#${request.orderId}</strong> has been successfully completed.</p>
        <p>Thank you for shopping with Snail Studio.</p>
      </div>
    `,
  });
}

// ---------------------------------------------------------------------------
// Specific Replacement Event Triggers
// ---------------------------------------------------------------------------

export async function notifyReplacementRequestReceived(request: {
  id: string;
  orderId: string;
  customerId: string;
  reason?: string | null;
}) {
  return dispatchReturnNotification({
    requestId: request.id,
    orderId: request.orderId,
    customerId: request.customerId,
    eventType: "REPLACEMENT_REQUEST_RECEIVED",
    adminTitle: "New Replacement Request Received",
    adminMessage: `A replacement request (${request.id}) has been submitted for order #${request.orderId}. Reason: ${request.reason || "Not specified"}.`,
    customerSubject: `[Snail Studio] Replacement Request Received (Order #${request.orderId})`,
    customerHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #AC5429;">Replacement Request Received</h2>
        <p>We have received your replacement request for Order <strong>#${request.orderId}</strong>.</p>
        <p>Our team is currently reviewing your request. You will receive an update as soon as it has been processed.</p>
        <p>Request ID: <code>${request.id}</code></p>
      </div>
    `,
  });
}

export async function notifyReplacementApproved(request: {
  id: string;
  orderId: string;
  customerId: string;
  paymentResponsibility?: string | null;
}) {
  const paymentInfo =
    request.paymentResponsibility === "CUSTOMER_PAYS"
      ? " Please complete replacement shipping payment as instructed."
      : "";

  return dispatchReturnNotification({
    requestId: request.id,
    orderId: request.orderId,
    customerId: request.customerId,
    eventType: "REPLACEMENT_APPROVED",
    adminTitle: "Replacement Request Approved",
    adminMessage: `Replacement request ${request.id} for order #${request.orderId} was approved.`,
    customerSubject: `[Snail Studio] Replacement Request Approved (Order #${request.orderId})`,
    customerHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4CAF50;">Replacement Request Approved</h2>
        <p>Good news! Your replacement request for Order <strong>#${request.orderId}</strong> has been approved.${paymentInfo}</p>
        <p>Our team will prepare your replacement item and initiate the exchange shortly.</p>
      </div>
    `,
  });
}

export async function notifyReplacementRejected(request: {
  id: string;
  orderId: string;
  customerId: string;
  adminNotes?: string | null;
}) {
  return dispatchReturnNotification({
    requestId: request.id,
    orderId: request.orderId,
    customerId: request.customerId,
    eventType: "REPLACEMENT_REJECTED",
    adminTitle: "Replacement Request Rejected",
    adminMessage: `Replacement request ${request.id} for order #${request.orderId} was rejected. Notes: ${request.adminNotes || "N/A"}.`,
    customerSubject: `[Snail Studio] Update on Replacement Request (Order #${request.orderId})`,
    customerHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #d32f2f;">Replacement Request Update</h2>
        <p>Your replacement request for Order <strong>#${request.orderId}</strong> could not be approved at this time.</p>
        ${request.adminNotes ? `<p><strong>Reason / Notes:</strong> ${request.adminNotes}</p>` : ""}
        <p>If you have any questions, please reach out to customer support.</p>
      </div>
    `,
  });
}

export async function notifyReplacementShipped(request: {
  id: string;
  orderId: string;
  customerId: string;
  waybill?: string | null;
}) {
  return dispatchReturnNotification({
    requestId: request.id,
    orderId: request.orderId,
    customerId: request.customerId,
    eventType: "REPLACEMENT_SHIPPED",
    adminTitle: "Replacement Exchange Shipped",
    adminMessage: `Delhivery REPL exchange shipment created for replacement request ${request.id} (Order #${request.orderId}). Single AWB: ${request.waybill || "Pending"}.`,
    customerSubject: `[Snail Studio] Replacement Exchange Shipped (Order #${request.orderId})`,
    customerHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #AC5429;">Replacement Exchange Shipped</h2>
        <p>Your replacement exchange for Order <strong>#${request.orderId}</strong> is on its way!</p>
        ${request.waybill ? `<p>Exchange Waybill: <strong>${request.waybill}</strong></p>` : ""}
        <p>Please keep the original item packaged and ready to hand over to the courier during delivery.</p>
      </div>
    `,
  });
}

export async function notifyReplacementDelivered(request: {
  id: string;
  orderId: string;
  customerId: string;
}) {
  return dispatchReturnNotification({
    requestId: request.id,
    orderId: request.orderId,
    customerId: request.customerId,
    eventType: "REPLACEMENT_DELIVERED",
    adminTitle: "Replacement Request Completed",
    adminMessage: `Replacement exchange request ${request.id} for order #${request.orderId} is now marked COMPLETED.`,
    customerSubject: `[Snail Studio] Replacement Exchange Completed (Order #${request.orderId})`,
    customerHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4CAF50;">Replacement Exchange Completed</h2>
        <p>Your replacement exchange for Order <strong>#${request.orderId}</strong> has been successfully completed.</p>
        <p>Thank you for shopping with Snail Studio!</p>
      </div>
    `,
  });
}
