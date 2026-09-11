import { db } from "@/db";
import { orders, orderItems, orderAddresses, orderStatusHistory, users, shipmentAuditLogs, refunds as refundsTable, returnRequests, payments } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendMail } from "@/services/email/email.service";
import { getOrderConfirmationTemplate } from "@/services/email/templates/order-confirmation.template";
import { getOrderStatusUpdateTemplate } from "@/services/email/templates/order-status-update.template";
import { releaseCouponReservation } from "./coupon-engine.service";

/**
 * Allowed state transitions for Order Fulfilment State Machine.
 */
export const ALLOWED_ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ["placed", "paid", "confirmed", "cancelled"],
  placed: ["confirmed", "cancelled"],
  paid: ["confirmed", "processing", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["ready_to_ship", "cancelled"],
  ready_to_ship: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["returned"],
  cancelled: ["refunded", "partially_refunded"],
  returned: [],
  refunded: [],
  partially_refunded: [],
};

/**
 * Validates whether an order status transition is allowed by business rules.
 */
export function validateOrderTransition(
  currentStatus: string,
  targetStatus: string,
  options?: { isLogisticsEvent?: boolean }
): { valid: boolean; reason?: string } {
  const current = (currentStatus || "").toLowerCase();
  const target = (targetStatus || "").toLowerCase();

  if (current === target) {
    return { valid: true };
  }

  // Enforce logistics event lock on shipped and delivered
  if ((target === "shipped" || target === "delivered") && !options?.isLogisticsEvent) {
    return {
      valid: false,
      reason: `Order status cannot be manually set to '${target}'. Logistics states ('shipped', 'delivered') are updated automatically when physical carrier events are scanned.`,
    };
  }

  const allowedNext = ALLOWED_ORDER_TRANSITIONS[current] || [];
  if (!allowedNext.includes(target)) {
    return {
      valid: false,
      reason: `Invalid transition from '${current}' to '${target}'. Allowed next states from '${current}': [${allowedNext.join(", ")}]. Arbitrary state jumps are blocked.`,
    };
  }

  return { valid: true };
}

/**
 * Creates a pending order in the database with associated items and shipping/billing addresses.
 * 
 * @param params Order parameters including items, addresses, and optional notes.
 * @param tx Optional transaction client.
 * @returns The generated order metadata.
 */
export async function createPendingOrder(
  params: {
    userId: string | null;
    cartItems: {
      variantId: string;
      quantity: number;
      price: number; // Variant price at the time of purchase
    }[];
    shippingAddress: {
      name: string;
      phone: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    billingAddress?: {
      name: string;
      phone: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    notes?: string;
    couponCode?: string;
    discountAmount?: number;
    shippingAmount?: number;
  },
  tx?: any
) {
  const client = tx || db;
  const orderId = `ord_${nanoid(10)}`;

  // Calculate order subtotal amount (in paise / INR subunit)
  let subtotal = 0;
  for (const item of params.cartItems) {
    subtotal += item.quantity * item.price;
  }

  const shipping = params.shippingAmount || 0;
  const discount = params.discountAmount || 0;
  const total = Math.max(0, subtotal + shipping - discount);

  // 1. Insert order record
  await client.insert(orders).values({
    id: orderId,
    userId: params.userId,
    status: "pending",
    totalAmount: total,
    taxAmount: 0,
    shippingAmount: shipping,
    discountAmount: discount,
    couponCode: params.couponCode || null,
    notes: params.notes || null,
  });

  // 2. Insert order items
  for (const item of params.cartItems) {
    await client.insert(orderItems).values({
      id: `oi_${nanoid(10)}`,
      orderId,
      variantId: item.variantId,
      quantity: item.quantity,
      price: item.price,
      discount: 0,
    });
  }

  // 3. Insert shipping address
  await client.insert(orderAddresses).values({
    id: `addr_${nanoid(10)}`,
    orderId,
    type: "shipping",
    name: params.shippingAddress.name,
    phone: params.shippingAddress.phone,
    addressLine1: params.shippingAddress.addressLine1,
    addressLine2: params.shippingAddress.addressLine2 || null,
    city: params.shippingAddress.city,
    state: params.shippingAddress.state,
    postalCode: params.shippingAddress.postalCode,
    country: params.shippingAddress.country,
  });

  // 4. Insert billing address (fallback to shipping details if billing address not explicitly provided)
  const billing = params.billingAddress || params.shippingAddress;
  await client.insert(orderAddresses).values({
    id: `addr_${nanoid(10)}`,
    orderId,
    type: "billing",
    name: billing.name,
    phone: billing.phone,
    addressLine1: billing.addressLine1,
    addressLine2: billing.addressLine2 || null,
    city: billing.city,
    state: billing.state,
    postalCode: billing.postalCode,
    country: billing.country,
  });

  // 5. Create initial order status history log
  await client.insert(orderStatusHistory).values({
    id: `osh_${nanoid(10)}`,
    orderId,
    status: "pending",
    notes: "Order initiated in checkout state machine.",
  });

  return {
    id: orderId,
    totalAmount: subtotal,
  };
}

/**
 * Retrieves a detailed order record by its ID, including items, addresses, and status logs.
 * 
 * @param orderId The internal order ID.
 * @param tx Optional transaction client.
 */
export async function getOrderById(orderId: string, tx?: any) {
  const client = tx || db;
  return client.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      items: {
        with: {
          variant: true,
        },
      },
      addresses: true,
      statusHistory: true,
      user: true,
      activeShipment: true,
    },
  });
}

/**
 * Updates an order's status and logs the event to order status history.
 * Enforces transition validation rules via validateOrderTransition.
 * 
 * @param orderId The internal order ID.
 * @param status The new status.
 * @param notes Optional notes explaining the status change.
 * @param tx Optional transaction client.
 * @param isLogisticsEvent Set to true if transition is triggered by automated carrier event.
 */
export async function updateOrderStatus(
  orderId: string,
  status: string,
  notes?: string,
  tx?: any,
  isLogisticsEvent: boolean = false,
  adminId?: string,
  adminName?: string
) {
  const client = tx || db;

  const orderRecord = await client.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (orderRecord) {
    const transitionCheck = validateOrderTransition(orderRecord.status, status, { isLogisticsEvent });
    if (!transitionCheck.valid) {
      throw new Error(transitionCheck.reason);
    }
  }

  const updateData: any = {
    status: status as any,
    updatedAt: new Date(),
  };

  if (status === "paid") {
    updateData.shippingChargePaid = sql`shipping_amount`;
  }

  await client
    .update(orders)
    .set(updateData)
    .where(eq(orders.id, orderId));

  await client.insert(orderStatusHistory).values({
    id: `osh_${nanoid(10)}`,
    orderId,
    status,
    notes: notes || `Order status transitioned to ${status}.`,
  });

  if (adminId) {
    await client.insert(shipmentAuditLogs).values({
      id: `audit_${nanoid(10)}`,
      orderId,
      adminId,
      adminName: adminName || "Admin",
      action: `ORDER_STATUS_${status.toUpperCase()}`,
      previousState: orderRecord ? JSON.stringify({ status: orderRecord.status }) : null,
      newState: JSON.stringify({ status }),
      notes: notes || `Order status updated to ${status} by ${adminName || "Admin"}`,
      createdAt: new Date(),
    });
  }

  if (status === "cancelled") {
    await releaseCouponReservation(orderId, client);
  }

  // EMAIL NOTIFICATION TRIGGER
  (async () => {
    try {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          user: true,
          addresses: true,
          items: {
            with: {
              variant: {
                with: {
                  product: true
                }
              }
            }
          }
        }
      });

      if (!order) {
        console.error(`[Email Trigger] Order not found for ID: ${orderId}`);
        return;
      }

      const userEmail = order.user?.email || null;
      if (!userEmail) {
        return;
      }

      const customerName = order.user?.name || "Customer";
      const shippingAddress = order.addresses.find(addr => addr.type === "shipping");

      if (status.toLowerCase() === "paid" || (status.toLowerCase() === "processing" && order.status === "pending")) {
        const items = order.items.map(item => ({
          productName: item.variant?.product?.name || "Luxury Handcrafted Nails",
          variantName: item.variant?.name || "Default Style",
          quantity: item.quantity,
          price: item.price
        }));

        const subtotal = order.totalAmount - order.shippingAmount - order.taxAmount + order.discountAmount;

        const html = getOrderConfirmationTemplate({
          customerName,
          orderId: order.id,
          items,
          subtotal,
          tax: order.taxAmount,
          shipping: order.shippingAmount,
          discount: order.discountAmount,
          total: order.totalAmount,
          shippingAddress: {
            name: shippingAddress?.name || customerName,
            phone: shippingAddress?.phone || order.user?.phoneNumber || "",
            addressLine1: shippingAddress?.addressLine1 || "N/A",
            addressLine2: shippingAddress?.addressLine2 || null,
            city: shippingAddress?.city || "N/A",
            state: shippingAddress?.state || "N/A",
            postalCode: shippingAddress?.postalCode || "N/A",
            country: shippingAddress?.country || "IN",
          }
        });

        await sendMail({
          to: userEmail,
          subject: `Order Confirmed - Snail Studio (#${order.id})`,
          html,
          templateName: "order_confirmation"
        });

      } else {
        const html = getOrderStatusUpdateTemplate({
          customerName,
          orderId: order.id,
          newStatus: status,
          statusNotes: notes,
          updatedAt: new Date()
        });

        await sendMail({
          to: userEmail,
          subject: `Order Status Update - Snail Studio (#${order.id})`,
          html,
          templateName: "order_status_update"
        });
      }
    } catch (emailErr) {
      console.error(`[Email Trigger Error] Failed to process order status notification for ${orderId}:`, emailErr);
    }
  })();
}

export interface CancelAndRefundOrderParams {
  orderId: string;
  reason: string;
  refundType: "full" | "custom";
  refundAmountPaise?: number;
  adminId: string;
  adminName?: string;
}

/**
 * Cancels an order pre-dispatch and computes/issues full or custom refunds.
 */
export async function cancelAndRefundOrder(params: CancelAndRefundOrderParams, tx?: any) {
  const { orderId, reason, refundType, refundAmountPaise, adminId, adminName = "Admin" } = params;
  const trimmedReason = reason?.trim();

  if (!trimmedReason || trimmedReason.length < 3) {
    throw new Error("A valid cancellation reason (minimum 3 characters) is required.");
  }

  const client = tx || db;

  const order = await client.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      payments: true,
      shipments: true,
    },
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const PRE_DISPATCH_STATUSES = ["pending", "placed", "paid", "confirmed", "processing", "ready_to_ship"];
  if (!PRE_DISPATCH_STATUSES.includes(order.status.toLowerCase())) {
    throw new Error(
      `Cannot cancel order #${orderId}: Order is in status '${order.status}'. Cancellation is permitted only prior to dispatch (READY_TO_SHIP or earlier).`
    );
  }

  // Calculate refund amount
  let calculatedRefundPaise = 0;
  if (refundType === "full") {
    calculatedRefundPaise = order.totalAmount;
  } else if (refundType === "custom") {
    if (refundAmountPaise === undefined || refundAmountPaise <= 0) {
      throw new Error("Custom refund amount must be greater than 0 paise.");
    }
    if (refundAmountPaise > order.totalAmount) {
      throw new Error(
        `Refund amount (₹${(refundAmountPaise / 100).toFixed(2)}) cannot exceed total order amount (₹${(order.totalAmount / 100).toFixed(2)}).`
      );
    }
    calculatedRefundPaise = refundAmountPaise;
  }

  const refundPercentage = Math.round((calculatedRefundPaise / order.totalAmount) * 100);

  let targetStatus: "cancelled" | "refunded" | "partially_refunded" = "cancelled";
  if (calculatedRefundPaise === order.totalAmount) {
    targetStatus = "refunded";
  } else if (calculatedRefundPaise > 0) {
    targetStatus = "partially_refunded";
  }

  const now = new Date();

  // Handle gateway refund entry if online payment exists
  const successfulPayment = order.payments?.find(
    (p: any) => p.status === "succeeded" || p.status === "paid" || p.status === "captured"
  );
  if (successfulPayment && calculatedRefundPaise > 0) {
    const refundId = `ref_${nanoid(10)}`;
    await client.insert(refundsTable).values({
      id: refundId,
      paymentId: successfulPayment.id,
      gatewayRefundId: `rfd_${nanoid(10)}`,
      amount: calculatedRefundPaise,
      reason: trimmedReason,
      status: "succeeded",
      createdAt: now,
    });
  }

  // Update order status
  await client.update(orders).set({
    status: targetStatus,
    updatedAt: now,
  }).where(eq(orders.id, orderId));

  // Insert status history
  await client.insert(orderStatusHistory).values({
    id: `osh_${nanoid(10)}`,
    orderId,
    status: targetStatus,
    notes: `Order cancelled by ${adminName}. Reason: "${trimmedReason}". Refund type: ${refundType} (₹${(calculatedRefundPaise / 100).toFixed(2)}, ${refundPercentage}%).`,
    createdAt: now,
  });

  // Release coupon
  await releaseCouponReservation(orderId, client);

  // Log shipment audit log
  await client.insert(shipmentAuditLogs).values({
    id: `audit_${nanoid(10)}`,
    orderId,
    adminId,
    adminName,
    action: "ORDER_CANCELLED_AND_REFUNDED",
    previousState: JSON.stringify({ status: order.status, totalAmount: order.totalAmount }),
    newState: JSON.stringify({ status: targetStatus, refundAmountPaise: calculatedRefundPaise, refundPercentage }),
    notes: `Cancelled & Refunded by ${adminName}. Reason: ${trimmedReason}`,
    createdAt: now,
  });

  return {
    success: true,
    orderId,
    status: targetStatus,
    refundAmountPaise: calculatedRefundPaise,
    refundPercentage,
    message: `Order successfully transitioned to ${targetStatus}. Refund of ₹${(calculatedRefundPaise / 100).toFixed(2)} (${refundPercentage}%) processed.`,
  };
}

/**
 * Processes a Return Refund for a delivered order.
 * Marks the return request as COMPLETED, records a refund, and sets order status to 'returned'.
 */
export async function processReturnRefund(params: {
  orderId: string;
  returnRequestId?: string;
  reason: string;
  refundType: "full" | "custom";
  refundAmountPaise?: number;
  adminId: string;
  adminName?: string;
}) {
  const { orderId, returnRequestId, reason, refundType, refundAmountPaise, adminId, adminName } = params;

  const orderRecord = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      payments: true,
      returnRequests: true,
      items: true,
    },
  });

  if (!orderRecord) {
    throw new Error(`Order ${orderId} not found.`);
  }

  // Find targeted return request or active return request
  const targetReturnReq = returnRequestId
    ? orderRecord.returnRequests.find((r) => r.id === returnRequestId)
    : orderRecord.returnRequests[0];

  let calculatedRefundPaise = refundAmountPaise || orderRecord.totalAmount;
  if (refundType === "full") {
    if (targetReturnReq && targetReturnReq.orderItemId) {
      const item = orderRecord.items.find((i) => i.id === targetReturnReq.orderItemId);
      if (item) {
        calculatedRefundPaise = Math.max(0, (item.price - item.discount) * item.quantity);
      }
    }
  }

  if (calculatedRefundPaise <= 0 || calculatedRefundPaise > orderRecord.totalAmount) {
    throw new Error(
      `Invalid refund amount (₹${(calculatedRefundPaise / 100).toFixed(2)}). Must be between ₹0.01 and ₹${(
        orderRecord.totalAmount / 100
      ).toFixed(2)}.`
    );
  }

  // 1. Mark return request as COMPLETED
  if (targetReturnReq) {
    await db
      .update(returnRequests)
      .set({ status: "COMPLETED", updatedAt: new Date() })
      .where(eq(returnRequests.id, targetReturnReq.id));
  }

  // 2. Insert Refund record linked to primary checkout payment
  const payment = orderRecord.payments.find((p) => p.status === "succeeded") || orderRecord.payments[0];
  const paymentId = payment ? payment.id : `pmt_mock_${nanoid(10)}`;

  if (!payment) {
    await db.insert(payments).values({
      id: paymentId,
      orderId,
      gateway: "mock_development",
      status: "succeeded",
      amount: orderRecord.totalAmount,
      currency: "INR",
    });
  }

  const refundId = `ref_${nanoid(12)}`;
  await db.insert(refundsTable).values({
    id: refundId,
    paymentId,
    gatewayRefundId: `rfd_${nanoid(12)}`,
    amount: calculatedRefundPaise,
    reason,
    status: "succeeded",
  });

  // 3. Update Order Status to 'returned'
  await db
    .update(orders)
    .set({ status: "returned" as any, updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  // 4. Insert Order Status History log
  await db.insert(orderStatusHistory).values({
    id: `osh_${nanoid(10)}`,
    orderId,
    status: "returned",
    notes: `Returned item received and verified. Refund of ₹${(calculatedRefundPaise / 100).toFixed(
      2
    )} issued. Notes: ${reason}`,
  });

  // 5. Insert Shipment Audit Log
  await db.insert(shipmentAuditLogs).values({
    id: `audit_${nanoid(10)}`,
    orderId,
    adminId,
    adminName: adminName || "Admin",
    action: "RETURN_REFUND_PROCESSED",
    previousState: JSON.stringify({ status: orderRecord.status }),
    newState: JSON.stringify({ status: "returned", refundAmountPaise: calculatedRefundPaise }),
    notes: `Return refund processed by ${adminName || "Admin"}. Refund Amount: ₹${(
      calculatedRefundPaise / 100
    ).toFixed(2)}.`,
  });

  return {
    success: true,
    message: `Return refund of ₹${(calculatedRefundPaise / 100).toFixed(
      2
    )} processed successfully. Order status updated to Returned.`,
    refundId,
    refundAmountPaise: calculatedRefundPaise,
    status: "returned",
  };
}

