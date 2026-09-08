import { delhiveryFetch, DelhiveryApiError } from "./client";
import { canPerformDelhiveryAction } from "./action-eligibility";

export interface SubmitDelhiveryActionRequest {
  waybill: string;
  action: 'REATTEMPT' | 'DEFER_DLV' | 'EDIT_DETAILS' | 'PICKUP_RESCHEDULE' | 'RTO_REQUESTED';
  payload?: {
    deferredDate?: string;
    remarks?: string;
    address?: string;
    phone?: string;
    name?: string;
  };
}

/**
 * Submits an operational NDR / Carrier Action to Delhivery API asynchronously.
 * Endpoint: POST /api/p/edit
 */
export async function submitDelhiveryCarrierAction(
  waybill: string,
  action: 'REATTEMPT' | 'DEFER_DLV' | 'EDIT_DETAILS' | 'PICKUP_RESCHEDULE' | 'RTO_REQUESTED',
  payload?: any
): Promise<{ success: boolean; providerReference?: string; message?: string; rawResponse?: any }> {
  const cleanWaybill = waybill.trim();
  if (!cleanWaybill) {
    throw new Error("Waybill number is required to submit carrier action.");
  }

  // Delhivery action mapping strings
  const actionMap: Record<string, string> = {
    REATTEMPT: "RE-ATTEMPT",
    DEFER_DLV: "DEFER_DLV",
    EDIT_DETAILS: "EDIT_DETAILS",
    PICKUP_RESCHEDULE: "PICKUP_RESCHEDULE",
    RTO_REQUESTED: "CANCEL",
  };

  const delhiveryAct = actionMap[action] || action;

  const bodyData: Record<string, any> = {
    waybill: cleanWaybill,
    act: delhiveryAct,
    comments: payload?.remarks || `Admin action ${action} requested for waybill ${cleanWaybill}`,
    reason: payload?.remarks || `Admin action ${action} requested for waybill ${cleanWaybill}`,
  };

  if (payload?.clientRefId || payload?.orderId) {
    bodyData.client_ref_id = payload.clientRefId || payload.orderId;
  }

  if (action === "DEFER_DLV" && payload?.deferredDate) {
    bodyData.deferred_date = payload.deferredDate;
  }

  if (action === "EDIT_DETAILS" && payload?.address) {
    bodyData.address = payload.address;
    if (payload.phone) bodyData.phone = payload.phone;
    if (payload.name) bodyData.name = payload.name;
  }

  try {
    const resData = await delhiveryFetch({
      endpoint: "/api/p/edit",
      method: "POST",
      body: bodyData,
    });

    const providerReference = resData?.upl || resData?.reference_id || resData?.data?.upl || `UPL_${Date.now()}`;
    const successStatus = resData?.status === "SUCCESS" || resData?.success === true || !!resData?.upl;

    return {
      success: successStatus,
      providerReference: String(providerReference),
      message: resData?.message || resData?.status || "Carrier action submitted successfully.",
      rawResponse: resData,
    };
  } catch (error: any) {
    throw new DelhiveryApiError(
      `Delhivery Carrier Action Error: ${error.message || String(error)}`,
      error.statusCode,
      error.rawData
    );
  }
}

export { canPerformDelhiveryAction };
