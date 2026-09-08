import {
  REATTEMPT_ELIGIBLE_NSL_CODES,
  PICKUP_EXCEPTION_NSL_CODES,
} from "./delhivery-exception-codes";

export interface ActionEligibilityRequest {
  action: 'REATTEMPT' | 'DEFER_DLV' | 'EDIT_DETAILS' | 'PICKUP_RESCHEDULE' | 'RTO_REQUESTED';
  shipment: {
    id: string;
    status: string;
    attemptNumber?: number;
    isExternal?: boolean;
    provider?: string;
  };
  exception?: {
    id: string;
    exceptionType: 'DELIVERY_NDR' | 'PICKUP_EXCEPTION' | 'RTO' | 'UNKNOWN_EXCEPTION';
    providerCode?: string | null;
    status: string;
    attemptCount?: number;
    metadata?: string | null;
  } | null;
  now?: Date;
}

export interface ActionEligibilityResult {
  eligible: boolean;
  reason?: string;
}

/**
 * Validates whether a specific Delhivery carrier action is eligible to be performed
 * based on official carrier rules and NSL code whitelists.
 */
export function canPerformDelhiveryAction(
  req: ActionEligibilityRequest
): ActionEligibilityResult {
  const { action, shipment, exception, now = new Date() } = req;

  if (shipment.provider === "external" || shipment.isExternal) {
    return {
      eligible: false,
      reason: "Carrier actions are only supported for Delhivery API shipments.",
    };
  }

  if (!exception) {
    return {
      eligible: false,
      reason: "No active shipment exception record found.",
    };
  }

  const code = (exception.providerCode || "").trim().toUpperCase();

  switch (action) {
    case "REATTEMPT": {
      if (exception.exceptionType !== "DELIVERY_NDR") {
        return {
          eligible: false,
          reason: "Reattempt can only be requested for customer delivery NDR exceptions.",
        };
      }

      if (!REATTEMPT_ELIGIBLE_NSL_CODES.includes(code as any)) {
        return {
          eligible: false,
          reason: `Reattempt is not allowed for NSL code "${code}". Allowed NSL codes are: ${REATTEMPT_ELIGIBLE_NSL_CODES.join(", ")}.`,
        };
      }

      if (exception.status !== "ACTION_REQUIRED") {
        return {
          eligible: false,
          reason: `Exception status is "${exception.status}". Reattempt requires "ACTION_REQUIRED".`,
        };
      }

      const attempts = exception.attemptCount || shipment.attemptNumber || 1;
      if (attempts > 3) {
        return {
          eligible: false,
          reason: `Maximum delivery attempts (3) reached for this shipment.`,
        };
      }

      return { eligible: true };
    }

    case "PICKUP_RESCHEDULE": {
      if (!PICKUP_EXCEPTION_NSL_CODES.includes(code as any)) {
        return {
          eligible: false,
          reason: `Pickup reschedule is only allowed for NSL codes: ${PICKUP_EXCEPTION_NSL_CODES.join(", ")}. Current code: "${code}".`,
        };
      }

      if (shipment.status !== "cancelled") {
        return {
          eligible: false,
          reason: `Shipment status must be "cancelled" for pickup reschedule. Current status: "${shipment.status}".`,
        };
      }

      // Metadata check for non-OTP cancellation
      let isNonOtp = true;
      if (exception.metadata) {
        try {
          const meta = JSON.parse(exception.metadata);
          if (meta.isOtpCancellation === true) {
            isNonOtp = false;
          }
        } catch {
          // Default to non-OTP if unparseable
        }
      }

      if (!isNonOtp) {
        return {
          eligible: false,
          reason: "Pickup reschedule is only available for non-OTP cancelled shipments.",
        };
      }

      // Check time constraint: after 9 PM (21:00)
      const currentHour = now.getHours();
      if (currentHour < 21) {
        return {
          eligible: false,
          reason: "Pickup reschedule instructions can only be submitted after 9:00 PM.",
        };
      }

      const attempt = exception.attemptCount || shipment.attemptNumber || 1;
      if (attempt !== 1 && attempt !== 2) {
        return {
          eligible: false,
          reason: `Pickup reschedule is only permitted for attempt count 1 or 2. Current attempt: ${attempt}.`,
        };
      }

      return { eligible: true };
    }

    case "DEFER_DLV":
    case "EDIT_DETAILS":
    case "RTO_REQUESTED": {
      if (exception.exceptionType !== "DELIVERY_NDR") {
        return {
          eligible: false,
          reason: `Action ${action} is only supported for DELIVERY_NDR exceptions.`,
        };
      }

      if (exception.status !== "ACTION_REQUIRED") {
        return {
          eligible: false,
          reason: `Exception status is "${exception.status}". Action requires "ACTION_REQUIRED".`,
        };
      }

      return { eligible: true };
    }

    default:
      return {
        eligible: false,
        reason: `Unsupported action type: ${action}`,
      };
  }
}
