import { db } from "@/db";
import { orders, orderItems, orderAddresses, orderStatusHistory } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

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

  // 1. Insert order record
  await client.insert(orders).values({
    id: orderId,
    userId: params.userId,
    status: "pending",
    totalAmount: subtotal,
    taxAmount: 0,
    shippingAmount: 0,
    discountAmount: 0,
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
}
