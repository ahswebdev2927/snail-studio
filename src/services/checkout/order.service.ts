import { db } from "@/db";
import { orders, orderItems, orderAddresses, orderStatusHistory, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendMail } from "@/services/email/email.service";
import { getOrderConfirmationTemplate } from "@/services/email/templates/order-confirmation.template";
import { getOrderStatusUpdateTemplate } from "@/services/email/templates/order-status-update.template";

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

  // EMAIL NOTIFICATION TRIGGER: Order Placed
  (async () => {
    try {
      if (params.userId) {
        const userRecord = await db.query.users.findFirst({
          where: eq(users.id, params.userId),
        });
        const userEmail = userRecord?.email;
        if (userEmail) {
          const html = getOrderStatusUpdateTemplate({
            customerName: userRecord.name || "Customer",
            orderId,
            newStatus: "pending",
            statusNotes: "Your order has been successfully placed and is awaiting payment verification.",
            updatedAt: new Date(),
          });
          await sendMail({
            to: userEmail,
            subject: `Order Placed - Snail Studio (#${orderId})`,
            html,
            templateName: "order_status_update",
          });
        }
      }
    } catch (err) {
      console.error("[Email Trigger Error] Failed to send Order Placed email:", err);
    }
  })();

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
    },
  });
}

/**
 * Updates an order's status and logs the event to order status history.
 * 
 * @param orderId The internal order ID.
 * @param status The new status.
 * @param notes Optional notes explaining the status change.
 * @param tx Optional transaction client.
 */
export async function updateOrderStatus(orderId: string, status: string, notes?: string, tx?: any) {
  const client = tx || db;

  await client
    .update(orders)
    .set({
      status: status as any,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  await client.insert(orderStatusHistory).values({
    id: `osh_${nanoid(10)}`,
    orderId,
    status,
    notes: notes || `Order status transitioned to ${status}.`,
  });

  // EMAIL NOTIFICATION TRIGGER
  // Fired asynchronously in the background so it doesn't block the request lifecycle
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
        console.log(`[Email Trigger] Order ${orderId} transitioned to ${status}, but no customer email is configured. Skipping.`);
        return;
      }

      const customerName = order.user?.name || "Customer";
      const shippingAddress = order.addresses.find(addr => addr.type === "shipping");

      // Send Order Confirmation if order just moved to 'paid' (or processing if from pending)
      if (status.toLowerCase() === "paid" || (status.toLowerCase() === "processing" && order.status === "pending")) {
        const items = order.items.map(item => ({
          productName: item.variant?.product?.name || "Luxury Handcrafted Nails",
          variantName: item.variant?.name || "Default Style",
          quantity: item.quantity,
          price: item.price
        }));

        // Calculate subtotal
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
        // Send a status progress email
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
