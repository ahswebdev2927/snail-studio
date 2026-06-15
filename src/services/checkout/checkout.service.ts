import { db } from "@/db";
import { carts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createPendingOrder } from "./order.service";
import { reserveStockForCart } from "./reservation.service";
import { initiatePaymentSession } from "./payment-session.service";
import { PaymentSession } from "@/lib/payments/types";

export interface CheckoutParams {
  cartId: string;
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
}

export interface CheckoutResult {
  orderId: string;
  totalAmount: number;
  paymentSession: PaymentSession;
}

/**
 * Executes the complete checkout state machine atomically inside a database transaction:
 * 1. Validates that the cart exists and is not empty.
 * 2. Checks inventory availability, recycles existing reservations, and generates new locks.
 * 3. Creates the order, inserts line items, and persists shipping/billing addresses.
 * 4. Generates a gateway payment session and registers a pending transaction record.
 * 
 * If any check or operation fails, the transaction is rolled back, releasing all locks.
 * 
 * @param params Checkout parameters (cartId, address, notes).
 * @returns The resulting order ID and gateway session details.
 */
export async function processCheckout(params: CheckoutParams): Promise<CheckoutResult> {
  return db.transaction(async (tx) => {
    // 1. Fetch the shopping cart with items and variant price information
    const cart = await tx.query.carts.findFirst({
      where: eq(carts.id, params.cartId),
      with: {
        items: {
          with: {
            variant: true
          }
        }
      }
    });

    if (!cart) {
      throw new Error(`Cart not found for ID: ${params.cartId}`);
    }

    if (!cart.items || cart.items.length === 0) {
      throw new Error("Cannot process checkout: The shopping cart is empty.");
    }

    // 2. Validate and reserve stock atomically (recycles holds and throws on stockout)
    const reservationItems = cart.items.map((item: any) => ({
      variantId: item.variantId,
      quantity: item.quantity
    }));
    
    await reserveStockForCart(params.cartId, reservationItems, tx);

    // 3. Map line items to order format with price snapshots
    const orderItemsData = cart.items.map((item: any) => ({
      variantId: item.variantId,
      quantity: item.quantity,
      price: item.variant.price
    }));

    // 4. Create pending order, items, and address records
    const orderMetadata = await createPendingOrder(
      {
        userId: cart.userId,
        cartItems: orderItemsData,
        shippingAddress: params.shippingAddress,
        billingAddress: params.billingAddress,
        notes: params.notes
      },
      tx
    );

    // 5. Initialize the payment gateway session (and insert payments DB log)
    const session = await initiatePaymentSession(orderMetadata.id, tx);

    // 6. Return the finalized order details
    return {
      orderId: orderMetadata.id,
      totalAmount: orderMetadata.totalAmount,
      paymentSession: session
    };
  });
}
