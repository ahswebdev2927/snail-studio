import { db } from "@/db";
import { orders, orderItems, returnRequests, productVariants } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { ReturnRequestType, CreateReturnRequestInput } from "./types";

export const RETURN_ELIGIBILITY_WINDOW_DAYS = 3;
export const RETURN_ELIGIBILITY_WINDOW_MS = RETURN_ELIGIBILITY_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export interface EligibilityResult {
  eligible: boolean;
  error?: string;
  orderItem?: any;
}

/**
 * Validates whether a customer can initiate a return or replacement request for a specific order item.
 */
export async function validateReturnEligibility(
  orderId: string,
  orderItemId: string,
  customerId: string,
  type: ReturnRequestType,
  replacementVariantId?: string | null,
  now: Date = new Date()
): Promise<EligibilityResult> {
  // 1. Fetch order with items, shipments, and existing return requests
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      items: true,
      shipments: true,
      returnRequests: {
        where: eq(returnRequests.orderItemId, orderItemId),
      },
    },
  });

  if (!order) {
    return { eligible: false, error: "Order not found." };
  }

  // 2. Ownership Validation
  if (order.userId !== customerId) {
    return { eligible: false, error: "You are not authorized to request a return for this order." };
  }

  // 3. Delivered-Order Validation
  if (order.status !== "delivered") {
    return { eligible: false, error: "Returns and replacements can only be requested for delivered orders." };
  }

  // 4. Return Window Validation (3-day policy)
  // Determine delivery time from active shipment updatedAt/shippedAt or order updatedAt
  let deliveryTimestamp: Date = order.updatedAt;
  const deliveredShipment = order.shipments?.find((s) => s.status === "delivered");
  if (deliveredShipment && deliveredShipment.updatedAt) {
    deliveryTimestamp = deliveredShipment.updatedAt;
  }

  const elapsedMs = now.getTime() - deliveryTimestamp.getTime();
  if (elapsedMs > RETURN_ELIGIBILITY_WINDOW_MS) {
    return {
      eligible: false,
      error: `Return and replacement requests must be submitted within ${RETURN_ELIGIBILITY_WINDOW_DAYS} days of delivery.`,
    };
  }

  // 5. Item Belonging Validation
  const item = order.items.find((i) => i.id === orderItemId);
  if (!item) {
    return { eligible: false, error: "The requested item does not belong to this order." };
  }

  // 6. Duplicate Request Protection
  const activeRequest = order.returnRequests?.find((req) =>
    ["PENDING_REVIEW", "APPROVED", "PROCESSING", "COMPLETED"].includes(req.status)
  );

  if (activeRequest) {
    return {
      eligible: false,
      error: `An active ${activeRequest.type.toLowerCase()} request (${activeRequest.status.replace("_", " ")}) already exists for this item.`,
    };
  }

  // 7. Replacement Variant Validation
  if (type === "REPLACEMENT") {
    if (!replacementVariantId) {
      return { eligible: false, error: "Replacement variant selection is required." };
    }

    const replacementVariant = await db.query.productVariants.findFirst({
      where: eq(productVariants.id, replacementVariantId),
    });

    if (!replacementVariant) {
      return { eligible: false, error: "Selected replacement variant does not exist." };
    }
  }

  return { eligible: true, orderItem: item };
}
