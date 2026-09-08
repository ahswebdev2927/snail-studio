import { NormalizedShipmentEvent } from "./event-normalizer";
import {
  lookupDelhiveryCode,
  DELHIVERY_DELIVERY_NDR_CODES,
  DELHIVERY_PICKUP_EXCEPTION_CODES,
  DELHIVERY_SUCCESS_CODES,
  PICKUP_EXCEPTION_NSL_CODES,
} from "./providers/delhivery/delhivery-exception-codes";

export interface ExceptionClassification {
  type: 'NORMAL' | 'DELIVERY_NDR' | 'PICKUP_EXCEPTION' | 'RTO' | 'DELIVERED' | 'UNKNOWN_EXCEPTION';
  providerCode?: string;
  reason?: string;
  remark?: string;
  supportsReattempt?: boolean;
  setsCancelledStatus?: boolean;
}

/**
 * Classifies a normalized shipment event into business exception types.
 * Enforces rule: "Pending ≠ NDR".
 */
export function classifyDelhiveryEvent(event: NormalizedShipmentEvent): ExceptionClassification {
  const code = (event.statusCode || "").trim().toUpperCase();
  const status = (event.status || "").trim().toLowerCase();
  const inst = (event.instructions || "").trim().toLowerCase();
  const scan = (event.scan || "").trim().toLowerCase();

  // 1. Delivered Check
  if (code === "EOD-135" || status === "delivered" || inst.includes("delivered to consignee")) {
    return {
      type: "DELIVERED",
      providerCode: code || "EOD-135",
      reason: "Delivered to Consignee",
      remark: event.instructions || event.status,
    };
  }

  // 2. Lookup in Delhivery Exception Registries
  const codeDef = lookupDelhiveryCode(code, event.status, event.instructions);

  if (codeDef) {
    if (codeDef.type === "PICKUP_EXCEPTION") {
      const isCancelledCode = PICKUP_EXCEPTION_NSL_CODES.includes(code as any);
      return {
        type: "PICKUP_EXCEPTION",
        providerCode: code || codeDef.code,
        reason: codeDef.reason,
        remark: event.instructions || event.status,
        supportsReattempt: false,
        setsCancelledStatus: isCancelledCode || codeDef.setsCancelledStatus,
      };
    }

    if (codeDef.type === "DELIVERY_NDR") {
      return {
        type: "DELIVERY_NDR",
        providerCode: code || codeDef.code,
        reason: codeDef.reason,
        remark: event.instructions || event.status,
        supportsReattempt: codeDef.supportsReattempt,
      };
    }

    if (codeDef.type === "RTO") {
      return {
        type: "RTO",
        providerCode: code || "RTO",
        reason: codeDef.reason,
        remark: event.instructions || event.status,
      };
    }
  }

  // 3. Status is "Pending" guard: Pending ALONE is NOT NDR!
  if (status === "pending" || status === "manifested" || code === "FMPUR-101") {
    return {
      type: "NORMAL",
      reason: "Pending / Normal Journey",
      remark: event.instructions || event.status,
    };
  }

  // 4. In Transit / Normal Out for Delivery
  if (
    status === "in transit" ||
    status === "dispatched" ||
    inst.includes("out for delivery") ||
    inst.includes("picked up")
  ) {
    return {
      type: "NORMAL",
      reason: "In Transit / Normal Transit Event",
      remark: event.instructions || event.status,
    };
  }

  // 5. Unknown / Unmapped Carrier Code Handling (No Guessing!)
  if (code && !DELHIVERY_DELIVERY_NDR_CODES[code] && !DELHIVERY_PICKUP_EXCEPTION_CODES[code] && !DELHIVERY_SUCCESS_CODES[code]) {
    return {
      type: "UNKNOWN_EXCEPTION",
      providerCode: code,
      reason: `Unmapped Provider Code: ${code}`,
      remark: event.instructions || event.status,
    };
  }

  return {
    type: "NORMAL",
    reason: "Standard Scan Event",
    remark: event.instructions || event.status,
  };
}
