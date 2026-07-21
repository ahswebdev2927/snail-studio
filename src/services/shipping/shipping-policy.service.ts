import { db } from "@/db";
import { systemSettings, orders, orderAddresses, orderAddressHistory, inventoryItems, inventoryReservations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface ShippingPolicySettings {
  shippingAdjustmentEnabled: boolean;
  shippingAdjustmentMode: 'automatic' | 'manual' | 'disabled';
  ignoreShippingDifference: boolean;
  ignoreDifferenceAmount: number; // in Rupees
  defaultPrepaidShipping: number; // in Rupees
  defaultCodShipping: number; // in Rupees
  shippingRateProvider: 'flat_rate' | 'zone_rules' | 'courier_api';
  shippingFallbackMode: 'default_charges' | 'manual_review';
  customerAddressEditUntil: 'pending' | 'paid' | 'confirmed' | 'processing' | 'never';
  adminCanEditAfterAwb: boolean;
  autoRegenerateAwb: boolean;
  shippingPaymentMode: 'razorpay' | 'offline' | 'absorb';
  shippingRefundMode: 'refund' | 'store_credit' | 'ignore' | 'manual';
}

/**
 * Fetch shipping settings from the system_settings table, providing defaults.
 */
export async function getShippingSettings(): Promise<ShippingPolicySettings> {
  const rows = await db.select().from(systemSettings);
  const settingsMap = new Map(rows.map((r) => [r.key, r.value]));

  const getBool = (key: string, def: boolean): boolean => {
    const val = settingsMap.get(key);
    if (val === undefined) return def;
    return val === "true" || val === "1" || val === "enabled" || val === "true";
  };

  const getString = <T extends string>(key: string, def: T): T => {
    return (settingsMap.get(key) as T) || def;
  };

  const getNum = (key: string, def: number): number => {
    const val = settingsMap.get(key);
    if (val === undefined) return def;
    const num = Number(val);
    return isNaN(num) ? def : num;
  };

  return {
    shippingAdjustmentEnabled: getBool("shippingAdjustmentEnabled", true),
    shippingAdjustmentMode: getString("shippingAdjustmentMode", "automatic"),
    ignoreShippingDifference: getBool("ignoreShippingDifference", true),
    ignoreDifferenceAmount: getNum("ignoreDifferenceAmount", 50),
    defaultPrepaidShipping: getNum("defaultPrepaidShipping", 70),
    defaultCodShipping: getNum("defaultCodShipping", 100),
    shippingRateProvider: getString("shippingRateProvider", "flat_rate"),
    shippingFallbackMode: getString("shippingFallbackMode", "default_charges"),
    customerAddressEditUntil: getString("customerAddressEditUntil", "processing"),
    adminCanEditAfterAwb: getBool("adminCanEditAfterAwb", false),
    autoRegenerateAwb: getBool("autoRegenerateAwb", true),
    shippingPaymentMode: getString("shippingPaymentMode", "razorpay"),
    shippingRefundMode: getString("shippingRefundMode", "ignore"),
  };
}

/**
 * Calculates the shipping rate in paise based on address and payment method (prepaid/COD).
 */
export async function calculateShippingRate(
  address: { state: string; postalCode: string; city: string },
  isCod: boolean,
  settings?: ShippingPolicySettings
): Promise<number> {
  const activeSettings = settings || (await getShippingSettings());
  const provider = activeSettings.shippingRateProvider;

  const defaultCharge = isCod
    ? activeSettings.defaultCodShipping * 100 // convert to paise
    : activeSettings.defaultPrepaidShipping * 100;

  try {
    if (provider === "flat_rate") {
      return defaultCharge;
    }

    if (provider === "zone_rules") {
      const pincode = address.postalCode.trim().replace(/\s+/g, "");
      const state = address.state.toLowerCase().trim();

      // Mumbai local (Starts with 400)
      if (pincode.startsWith("400") || state.includes("maharashtra")) {
        return 50 * 100; // ₹50 in paise
      }
      // Delhi NCR (Starts with 110)
      if (pincode.startsWith("110") || state.includes("delhi")) {
        return 70 * 100; // ₹70 in paise
      }
      // South zone (Starts with 560 for Bangalore / Karnataka)
      if (pincode.startsWith("560") || state.includes("karnataka")) {
        return 65 * 100; // ₹65 in paise
      }
      // Other Southern states
      if (state.includes("tamil nadu") || state.includes("kerala") || state.includes("andhra")) {
        return 80 * 100; // ₹80 in paise
      }

      // Rest of India standard zone rate
      return 120 * 100; // ₹120 in paise
    }

    if (provider === "courier_api") {
      const pincode = address.postalCode.trim().replace(/\s+/g, "");

      // Simulate API failure for specific pincode "999999" to test fallback
      if (pincode === "999999") {
        throw new Error("Courier API returned serviceability error");
      }

      const base = pincode.length % 2 === 0 ? 85 : 115;
      return base * 100; // in paise
    }

    return defaultCharge;
  } catch (error) {
    console.warn("Shipping rate calculation failed, falling back to default charges:", error);
    return defaultCharge;
  }
}

/**
 * Performs recalculations when shipping address is changed before AWB generation.
 */
export async function recalculateShippingForOrder(
  orderId: string,
  updatedAddress: { addressLine1: string; addressLine2?: string; city: string; state: string; postalCode: string; country: string }
) {
  // Fetch the order
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      payments: true,
    },
  });

  if (!order) {
    throw new Error(`Order not found for ID: ${orderId}`);
  }

  const settings = await getShippingSettings();

  // If shipping adjustment policy is disabled, keep original shipping charge
  if (!settings.shippingAdjustmentEnabled || settings.shippingAdjustmentMode === "disabled") {
    return {
      currentShippingCharge: order.shippingAmount,
      shippingDifference: 0,
      shippingDifferencePaid: 0,
      shippingDifferenceStatus: "none" as const,
      totalAmountAdjustment: 0,
      absorbAmount: 0,
    };
  }

  // Determine if COD order by checking status history/notes or if payment logs exist
  const isCod = order.payments.length === 0;

  // Calculate new shipping rate
  const currentShippingCharge = await calculateShippingRate(updatedAddress, isCod, settings);
  const originalShipping = order.shippingCalculatedAt !== null
    ? (order.currentShippingCharge - order.shippingDifference)
    : (order.shippingChargePaid > 0 ? order.shippingChargePaid : order.shippingAmount);

  const difference = currentShippingCharge - originalShipping;

  let shippingDifferenceStatus: 'none' | 'pending' | 'paid' | 'refunded' | 'waived' | 'manual_review' | 'store_credit' = 'none';
  let shippingDifferencePaid = 0;
  let totalAmountAdjustment = 0;
  let absorbAmount = 0;

  if (difference > 0) {
    // Recalculated shipping is HIGHER
    if (settings.ignoreShippingDifference) {
      const thresholdPaise = settings.ignoreDifferenceAmount * 100;
      if (difference <= thresholdPaise) {
        absorbAmount = difference;
        shippingDifferenceStatus = 'waived';
        totalAmountAdjustment = 0;
      } else {
        absorbAmount = thresholdPaise;
        totalAmountAdjustment = difference - thresholdPaise;
        shippingDifferenceStatus = 'pending';
      }
    } else {
      totalAmountAdjustment = difference;
      shippingDifferenceStatus = 'pending';
    }

    if (settings.shippingPaymentMode === "absorb") {
      absorbAmount = difference;
      totalAmountAdjustment = 0;
      shippingDifferenceStatus = "waived";
    }
  } else if (difference < 0) {
    // Recalculated shipping is LOWER
    if (settings.shippingRefundMode === "refund") {
      shippingDifferenceStatus = "refunded";
      totalAmountAdjustment = difference;
    } else if (settings.shippingRefundMode === "store_credit") {
      shippingDifferenceStatus = "store_credit";
      totalAmountAdjustment = 0;
    } else if (settings.shippingRefundMode === "manual") {
      shippingDifferenceStatus = "manual_review";
      totalAmountAdjustment = 0;
    } else {
      shippingDifferenceStatus = "none";
      totalAmountAdjustment = 0;
    }
  }

  return {
    currentShippingCharge,
    shippingDifference: difference,
    shippingDifferencePaid,
    shippingDifferenceStatus,
    totalAmountAdjustment,
    absorbAmount,
  };
}

/**
 * Validates pre-shipment requirements for an order before allowing AWB generation.
 */
export async function validatePreShipment(orderId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      addresses: true,
      items: true,
      payments: true,
    },
  });

  if (!order) {
    return { success: false, errors: ["Order not found."] };
  }

  const errors: string[] = [];

  // 1. Order status confirmed check
  const validStatuses = ["paid", "confirmed", "processing"];
  if (!validStatuses.includes(order.status)) {
    errors.push(`Order is in status '${order.status}'. Only Confirmed or Processing orders can be shipped.`);
  }

  // 2. Payment Verified (or COD)
  const isCod = order.payments.length === 0;
  if (!isCod) {
    const hasSucceededPayment = order.payments.some((p) => p.status === "succeeded");
    if (!hasSucceededPayment && order.status === "pending") {
      errors.push("Payment is not verified for this prepaid order.");
    }
  }

  // 3. Address Verified
  const shippingAddress = order.addresses.find((a) => a.type === "shipping");
  if (!shippingAddress) {
    errors.push("Shipping address is missing.");
  } else if (shippingAddress.postalCode.length < 5 || !shippingAddress.city || !shippingAddress.state) {
    errors.push("Shipping address validation failed: Pincode, City, or State is incomplete.");
  }

  // 4. Shipping Calculation check
  if (order.shippingCalculatedAt === null) {
    errors.push("Shipping charges have not been verified/calculated.");
  }

  // 5. Shipping Adjustment check (no pending payments)
  if (order.shippingDifferenceStatus === "pending") {
    errors.push("Shipping adjustment payment is pending from the customer.");
  }

  // 6. Inventory Reservation check
  for (const item of order.items) {
    if (!item.variantId) continue;
    const invItem = await db.query.inventoryItems.findFirst({
      where: eq(inventoryItems.variantId, item.variantId),
    });

    if (!invItem) {
      errors.push(`Inventory item not found for variant ID: ${item.variantId}`);
      continue;
    }

    const reservation = await db.query.inventoryReservations.findFirst({
      where: eq(inventoryReservations.inventoryItemId, invItem.id),
    });

    if (!reservation && invItem.stockLevel < item.quantity) {
      errors.push(`Insufficient stock reserved for variant: ${item.variantId}. Available: ${invItem.stockLevel}, Needed: ${item.quantity}`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}
