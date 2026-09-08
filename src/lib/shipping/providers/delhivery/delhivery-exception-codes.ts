/**
 * Centralized Provider-Specific Code Registry for Delhivery Carrier Exceptions & Statuses.
 * 
 * CRITICAL ARCHITECTURE RULES:
 * 1. RE-ATTEMPT action can ONLY be applied if the current NSL code is in REATTEMPT_ELIGIBLE_NSL_CODES:
 *    ["EOD-74", "EOD-15", "EOD-104", "EOD-43", "EOD-86", "EOD-11", "EOD-69", "EOD-6"]
 * 2. Pickup Exceptions ["EOD-777", "EOD-21"] mark the shipment status as 'Cancelled'.
 * 3. Pending ≠ NDR. Status "Pending" alone never triggers NDR classification.
 */

export const REATTEMPT_ELIGIBLE_NSL_CODES = [
  "EOD-74",
  "EOD-15",
  "EOD-104",
  "EOD-43",
  "EOD-86",
  "EOD-11",
  "EOD-69",
  "EOD-6",
] as const;

export type ReattemptEligibleCode = (typeof REATTEMPT_ELIGIBLE_NSL_CODES)[number];

export const PICKUP_EXCEPTION_NSL_CODES = [
  "EOD-777",
  "EOD-21",
] as const;

export type PickupExceptionCode = (typeof PICKUP_EXCEPTION_NSL_CODES)[number];

export interface ExceptionCodeDefinition {
  code: string;
  type: 'DELIVERY_NDR' | 'PICKUP_EXCEPTION' | 'RTO' | 'DELIVERED' | 'NORMAL';
  reason: string;
  description?: string;
  supportsReattempt?: boolean;
  setsCancelledStatus?: boolean;
}

export const DELHIVERY_DELIVERY_NDR_CODES: Record<string, ExceptionCodeDefinition> = {
  "EOD-11": {
    code: "EOD-11",
    type: "DELIVERY_NDR",
    reason: "Consignee Unavailable",
    description: "Customer was unavailable at destination address during delivery attempt.",
    supportsReattempt: true,
  },
  "EOD-15": {
    code: "EOD-15",
    type: "DELIVERY_NDR",
    reason: "Future Delivery Requested",
    description: "Consignee requested delivery at a future date.",
    supportsReattempt: true,
  },
  "EOD-74": {
    code: "EOD-74",
    type: "DELIVERY_NDR",
    reason: "Consignee Out of Station / Uncontactable",
    description: "Consignee is out of station or unreachable.",
    supportsReattempt: true,
  },
  "EOD-104": {
    code: "EOD-104",
    type: "DELIVERY_NDR",
    reason: "Premises Closed / Door Locked",
    description: "Delivery destination premises closed or door locked.",
    supportsReattempt: true,
  },
  "EOD-43": {
    code: "EOD-43",
    type: "DELIVERY_NDR",
    reason: "Incomplete / Incorrect Address",
    description: "Destination address provided is incomplete or untraceable.",
    supportsReattempt: true,
  },
  "EOD-86": {
    code: "EOD-86",
    type: "DELIVERY_NDR",
    reason: "Phone Unreachable / Switched Off",
    description: "Customer phone number unreachable or switched off.",
    supportsReattempt: true,
  },
  "EOD-69": {
    code: "EOD-69",
    type: "DELIVERY_NDR",
    reason: "Delivery Delayed / Rescheduled",
    description: "Delivery attempt delayed due to operational or customer constraint.",
    supportsReattempt: true,
  },
  "EOD-6": {
    code: "EOD-6",
    type: "DELIVERY_NDR",
    reason: "Refused Delivery",
    description: "Consignee refused to accept parcel at delivery attempt.",
    supportsReattempt: true,
  },
  "EOD-12": {
    code: "EOD-12",
    type: "DELIVERY_NDR",
    reason: "Address Untraceable",
    description: "Courier executive unable to locate address.",
    supportsReattempt: false,
  },
  "EOD-14": {
    code: "EOD-14",
    type: "DELIVERY_NDR",
    reason: "Consignee Rejected Shipment",
    description: "Consignee rejected delivery due to damaged outer packaging or refusal.",
    supportsReattempt: false,
  },
};

export const DELHIVERY_PICKUP_EXCEPTION_CODES: Record<string, ExceptionCodeDefinition> = {
  "EOD-777": {
    code: "EOD-777",
    type: "PICKUP_EXCEPTION",
    reason: "Pickup Cancelled / Reschedule Required",
    description: "Warehouse pickup cancelled or unattempted by courier.",
    supportsReattempt: false,
    setsCancelledStatus: true,
  },
  "EOD-21": {
    code: "EOD-21",
    type: "PICKUP_EXCEPTION",
    reason: "Pickup Attempt Failed",
    description: "Courier pickup executive attempted pickup but package was not ready/received.",
    supportsReattempt: false,
    setsCancelledStatus: true,
  },
  "X-PNP": {
    code: "X-PNP",
    type: "PICKUP_EXCEPTION",
    reason: "Pickup Pending / Failed",
    description: "Package not picked up from origin facility.",
    supportsReattempt: false,
    setsCancelledStatus: false,
  },
};

export const DELHIVERY_SUCCESS_CODES: Record<string, ExceptionCodeDefinition> = {
  "EOD-135": {
    code: "EOD-135",
    type: "DELIVERED",
    reason: "Delivered to Consignee",
    description: "Shipment successfully delivered.",
  },
};

/**
 * Normalizes and classifies an raw Delhivery event code or status.
 */
export function lookupDelhiveryCode(
  statusCode?: string,
  statusText?: string,
  instructions?: string
): ExceptionCodeDefinition | null {
  const code = (statusCode || "").trim().toUpperCase();
  const status = (statusText || "").trim().toLowerCase();
  const inst = (instructions || "").trim().toLowerCase();

  // 1. Direct code matching
  if (code && DELHIVERY_DELIVERY_NDR_CODES[code]) {
    return DELHIVERY_DELIVERY_NDR_CODES[code];
  }
  if (code && DELHIVERY_PICKUP_EXCEPTION_CODES[code]) {
    return DELHIVERY_PICKUP_EXCEPTION_CODES[code];
  }
  if (code && DELHIVERY_SUCCESS_CODES[code]) {
    return DELHIVERY_SUCCESS_CODES[code];
  }

  // 2. RTO pattern matching
  if (
    status.includes("rto") ||
    status.includes("return to origin") ||
    status.includes("returned") ||
    status.includes("reverse") ||
    inst.includes("rto started") ||
    inst.includes("reverse in transit") ||
    inst.includes("origin facility")
  ) {
    return {
      code: code || "RTO_EVENT",
      type: "RTO",
      reason: "Return To Origin / Reverse Movement",
      description: statusText || instructions || "Package in RTO journey",
    };
  }

  // 3. Fallback text keyword inspection
  if (status.includes("undelivered") || status.includes("ndr") || inst.includes("undelivered")) {
    return {
      code: code || "NDR_GENERIC",
      type: "DELIVERY_NDR",
      reason: statusText || instructions || "Delivery NDR Exception",
      supportsReattempt: REATTEMPT_ELIGIBLE_NSL_CODES.includes(code as any),
    };
  }

  return null;
}
