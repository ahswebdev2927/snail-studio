import { db } from "@/db";
import { payments, orders, refunds, inventoryItems, inventoryReservations, inventoryTransactions, cartItems, carts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getPaymentProvider } from "@/lib/payments/payment-factory";
import { PaymentSession, PaymentVerificationResult, RefundResult } from "@/lib/payments/types";
import { updateOrderStatus } from "../checkout/order.service";

/**
 * Creates a payment session with the active gateway and logs a pending payment record in the DB.
 * 
 * @param orderId The internal application order ID.
 * @param tx Optional transaction client.
 * @returns The generated payment session.
 */
export async function createPaymentSession(orderId: string, tx?: any): Promise<PaymentSession> {
  const client = tx || db;

  // 1. Fetch order details
  const order = await client.query.orders.findFirst({
    where: eq(orders.id, orderId)
  });

  if (!order) {
    throw new Error(`Order not found for ID: ${orderId}`);
  }

  if (order.status !== "pending") {
    throw new Error(`Cannot initiate checkout payment for order in status '${order.status}'`);
  }

  // 2. Instantiate provider and generate session
  const provider = getPaymentProvider();
  const session = await provider.createPayment(orderId, order.totalAmount);

  // 3. Record the transaction attempt in the database
  const paymentId = `pmt_${nanoid(12)}`;
  await client.insert(payments).values({
    id: paymentId,
    orderId: order.id,
    gateway: session.gateway,
    gatewayTransactionId: session.id, // Stores the gateway order ID (e.g. order_mock_xxx) temporarily until payment capture
    status: "pending",
    amount: session.amount,
    currency: session.currency
  });

  return session;
}

/**
 * Verifies a payment's capture status/signature and updates the payment record in the DB.
 * 
 * @param params Verification details received from the payment client callback.
 * @param tx Optional transaction client.
 * @returns The payment verification result.
 */
export async function verifyAndRecordPayment(
  params: {
    paymentId: string; // Gateway transaction payment ID (e.g. pay_xxx)
    orderId: string;   // Internal application order ID
    gatewayOrderId: string; // Gateway order ID (e.g. order_xxx)
    signature?: string;     // Signature string (required for production gateway)
  },
  tx?: any
): Promise<PaymentVerificationResult> {
  const client = tx || db;

  // 1. Verify transaction state using the active gateway provider
  const provider = getPaymentProvider();
  const verificationResult = await provider.verifyPayment({
    paymentId: params.paymentId,
    orderId: params.orderId,
    gatewayOrderId: params.gatewayOrderId,
    signature: params.signature
  });

  // 2. Fetch the corresponding pending payment record by order ID and gateway order ID
  const paymentRecord = await client.query.payments.findFirst({
    where: and(
      eq(payments.orderId, params.orderId),
      eq(payments.gatewayTransactionId, params.gatewayOrderId)
    )
  });

  if (!paymentRecord) {
    throw new Error(`Pending payment record not found for orderId ${params.orderId} and gatewayOrderId ${params.gatewayOrderId}`);
  }

  // 3. Update the payment transaction record in the database
  await client
    .update(payments)
    .set({
      status: verificationResult.success ? "succeeded" : "failed",
      gatewayTransactionId: verificationResult.gatewayTransactionId || params.paymentId // Store the actual payment ID
    })
    .where(eq(payments.id, paymentRecord.id));

  return verificationResult;
}

/**
 * Requests a refund for a payment transaction and registers a refund entry in the DB.
 * 
 * @param paymentRecordId The internal database ID of the payment record.
 * @param amount Optional partial refund amount in paise. If omitted, refunds full amount.
 * @param reason Optional refund reason description.
 * @param tx Optional transaction client.
 * @returns The refund result from the gateway.
 */
export async function refundOrderPayment(
  paymentRecordId: string,
  amount?: number,
  reason?: string,
  tx?: any
): Promise<RefundResult> {
  const client = tx || db;

  // 1. Retrieve the payment record from the database
  const paymentRecord = await client.query.payments.findFirst({
    where: eq(payments.id, paymentRecordId)
  });

  if (!paymentRecord) {
    throw new Error(`Payment record not found for ID: ${paymentRecordId}`);
  }

  if (paymentRecord.status !== "succeeded") {
    throw new Error(`Cannot refund payment that is in status '${paymentRecord.status}'`);
  }

  const refundAmount = amount !== undefined ? amount : paymentRecord.amount;

  if (refundAmount <= 0 || refundAmount > paymentRecord.amount) {
    throw new Error(`Invalid refund amount: ${refundAmount}. Must be greater than zero and less than or equal to original payment amount.`);
  }

  // 2. Call gateway provider to execute the refund request
  const provider = getPaymentProvider();
  const refundResult = await provider.refundPayment(
    paymentRecord.gatewayTransactionId!,
    refundAmount
  );

  // 3. Record the refund transaction in the database
  if (refundResult.success) {
    const refundId = `rfnd_${nanoid(12)}`;
    await client.insert(refunds).values({
      id: refundId,
      paymentId: paymentRecord.id,
      gatewayRefundId: refundResult.gatewayRefundId,
      amount: refundAmount,
      reason: reason || "Admin requested refund",
      status: refundResult.status
    });
  }

  return refundResult;
}

/**
 * Confirms an order's payment. Performs signature verification, updates payment/order records,
 * deducts inventory stock, logs inventory audit history, and releases stock reservations atomically.
 * 
 * @param params Confirmation input including orderId, paymentId, gatewayOrderId, and optional signature or cartId.
 * @returns Object indicating success.
 */
export async function confirmOrderPayment(params: {
  orderId: string;
  paymentId: string;
  gatewayOrderId?: string;
  signature?: string;
  cartId?: string;
}) {
  return db.transaction(async (tx) => {
    // 1. Fetch the order record
    const orderRecord = await tx.query.orders.findFirst({
      where: eq(orders.id, params.orderId),
      with: {
        items: true
      }
    });

    if (!orderRecord) {
      throw new Error(`Order not found for ID: ${params.orderId}`);
    }

    // Support idempotency: if order is already paid, return early
    if (orderRecord.status === "paid") {
      return { success: true, orderId: params.orderId, alreadyPaid: true };
    }

    if (orderRecord.status !== "pending") {
      throw new Error(`Cannot confirm payment for order in status '${orderRecord.status}'`);
    }

    // 2. Resolve gatewayOrderId from payment record if not explicitly provided
    let resolvedGatewayOrderId = params.gatewayOrderId;
    if (!resolvedGatewayOrderId) {
      const paymentRec = await tx.query.payments.findFirst({
        where: eq(payments.orderId, params.orderId)
      });
      if (paymentRec) {
        resolvedGatewayOrderId = paymentRec.gatewayTransactionId || undefined;
      }
    }

    if (!resolvedGatewayOrderId) {
      throw new Error(`Could not resolve gatewayOrderId for order ID: ${params.orderId}`);
    }

    // 3. Verify the payment with the gateway and update the payment log in DB
    const verification = await verifyAndRecordPayment(
      {
        paymentId: params.paymentId,
        orderId: params.orderId,
        gatewayOrderId: resolvedGatewayOrderId,
        signature: params.signature
      },
      tx
    );

    if (!verification.success) {
      throw new Error(`Payment verification failed: ${verification.errorMessage || "signature mismatch"}`);
    }

    // 4. Mark the order as paid in the database (which also inserts into order status history)
    await updateOrderStatus(params.orderId, "paid", "Payment verified and confirmed successfully.", tx);

    // 5. Resolve the cart ID
    let resolvedCartId = params.cartId;
    if (!resolvedCartId) {
      // Look up a cart associated with this user
      if (orderRecord.userId) {
        const userCart = await tx.query.carts.findFirst({
          where: eq(carts.userId, orderRecord.userId)
        });
        if (userCart) {
          resolvedCartId = userCart.id;
        }
      }
    }

    // 6. Convert reservations to physical stock deductions and log inventory transactions
    for (const item of orderRecord.items) {
      if (!item.variantId) continue;

      const invItem = await tx.query.inventoryItems.findFirst({
        where: eq(inventoryItems.variantId, item.variantId)
      });

      if (!invItem) {
        console.warn(`Warning: Inventory item not found for variant ID: ${item.variantId}. Skipping stock deduction.`);
        continue;
      }

      // Look up active reservation for this item and cart
      let reservationQuery: any = eq(inventoryReservations.inventoryItemId, invItem.id);
      if (resolvedCartId) {
        reservationQuery = and(reservationQuery, eq(inventoryReservations.cartId, resolvedCartId));
      }

      const reservation = await tx.query.inventoryReservations.findFirst({
        where: reservationQuery
      });

      // Release/delete reservation if found
      if (reservation) {
        await tx.delete(inventoryReservations).where(eq(inventoryReservations.id, reservation.id));
      }

      // Deduct physical stock level
      const newStockLevel = Math.max(0, invItem.stockLevel - item.quantity);
      await tx
        .update(inventoryItems)
        .set({ stockLevel: newStockLevel, updatedAt: new Date() })
        .where(eq(inventoryItems.id, invItem.id));

      // Create outbound inventory transaction log
      await tx.insert(inventoryTransactions).values({
        id: `it_${nanoid(12)}`,
        inventoryItemId: invItem.id,
        type: "outbound",
        quantity: item.quantity,
        reference: `order_${orderRecord.id}`
      });
    }

    // 7. Clear cart items upon successful checkout completion
    if (resolvedCartId) {
      await tx.delete(cartItems).where(eq(cartItems.cartId, resolvedCartId));
    }

    return {
      success: true,
      orderId: params.orderId,
      alreadyPaid: false
    };
  });
}
