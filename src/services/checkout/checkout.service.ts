import { db } from "@/db";
import { carts, productBundles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createPendingOrder } from "./order.service";
import { reserveStockForCart } from "./reservation.service";
import { initiatePaymentSession } from "./payment-session.service";
import { PaymentSession } from "@/lib/payments/types";
import { calculateBundleDiscount } from "@/lib/bundles";
import { validateCoupon, reserveCoupon } from "./coupon-engine.service";

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
  couponCode?: string;
  shippingAmount?: number;
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
 * 3. Validates coupons and bundles server-side to calculate discount amounts securely.
 * 4. Creates the order, inserts line items, and persists shipping/billing addresses.
 * 5. Reserves the coupon slot to protect against double-redemption race conditions.
 * 6. Generates a gateway payment session and registers a pending transaction record.
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
            variant: {
              with: {
                product: {
                  with: {
                    collections: true
                  }
                }
              }
            }
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

    // Calculate cart subtotal (in paise)
    let subtotal = 0;
    for (const item of cart.items) {
      subtotal += item.quantity * item.variant.price;
    }

    // 2. Validate coupon discount server-side if a coupon is provided
    let couponDiscount = 0;
    let couponObj: any = null;
    if (params.couponCode) {
      const couponValidation = await validateCoupon(
        params.couponCode,
        subtotal,
        params.cartId,
        cart.userId
      );

      if (!couponValidation.valid) {
        throw new Error(couponValidation.error || "Coupon validation failed.");
      }

      couponDiscount = couponValidation.discountAmount || 0;
      couponObj = couponValidation.coupon;
    }

    // 3. Fetch active bundles and calculate bundle discount server-side
    const activeBundles = await tx.query.productBundles.findMany({
      where: eq(productBundles.isActive, true),
      with: {
        items: true
      }
    });

    const cartItemsForBundle = cart.items.map((item: any) => ({
      id: item.id,
      productId: item.variant.productId,
      price: item.variant.price,
      quantity: item.quantity
    }));

    const { totalDiscount: bundleDiscount } = calculateBundleDiscount(cartItemsForBundle, activeBundles);

    // Sum discounts securely
    const finalDiscountAmount = couponDiscount + bundleDiscount;

    // 4. Validate and reserve stock atomically (recycles holds and throws on stockout)
    const reservationItems = cart.items.map((item: any) => ({
      variantId: item.variantId,
      quantity: item.quantity
    }));
    
    await reserveStockForCart(params.cartId, reservationItems, tx);

    // 5. Map line items to order format with price snapshots
    const orderItemsData = cart.items.map((item: any) => ({
      variantId: item.variantId,
      quantity: item.quantity,
      price: item.variant.price
    }));

    // 6. Create pending order, items, and address records
    const orderMetadata = await createPendingOrder(
      {
        userId: cart.userId,
        cartItems: orderItemsData,
        shippingAddress: params.shippingAddress,
        billingAddress: params.billingAddress,
        notes: params.notes,
        couponCode: params.couponCode,
        discountAmount: finalDiscountAmount,
        shippingAmount: params.shippingAmount
      },
      tx
    );

    // 7. If coupon was successfully applied, reserve the coupon slot
    if (couponObj && !couponObj.id.startsWith("fallback_")) {
      await reserveCoupon(couponObj.id, orderMetadata.id, cart.userId, tx);
    }

    // 8. Initialize the payment gateway session (and insert payments DB log)
    const session = await initiatePaymentSession(orderMetadata.id, tx);

    // 9. Return the finalized order details
    return {
      orderId: orderMetadata.id,
      totalAmount: orderMetadata.totalAmount,
      paymentSession: session
    };
  });
}
