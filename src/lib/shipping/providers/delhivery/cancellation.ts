import { CancelShipmentRequest } from "../../types";
import { getDelhiveryConfig } from "./config";

/**
 * Cancels a shipment in Delhivery.
 * Endpoint: POST /api/p/edit
 */
export async function cancelDelhiveryShipment(
  req: CancelShipmentRequest
): Promise<{ success: boolean; message?: string }> {
  const config = getDelhiveryConfig();
  const cleanWaybill = req.waybill.trim();

  if (!cleanWaybill) {
    throw new Error("Waybill number is required to cancel a shipment.");
  }

  const url = `${config.baseUrl}/api/p/edit`;

  const payload = {
    waybill: cleanWaybill,
    cancellation: "true",
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Delhivery Shipment Cancellation HTTP Error ${response.status}: ${errorText}`);
  }

  const resData = await response.json();

  // Validate cancellation response matching live Delhivery response schema
  const isSuccess = resData?.status === true || resData?.status === "Success" || resData?.status === "Canceled";

  if (!isSuccess || resData?.status === "Failure" || resData?.error) {
    const errorMsg = resData?.error || resData?.rmk || resData?.remark || resData?.message || "Delhivery rejected cancellation request.";
    return {
      success: false,
      message: typeof errorMsg === "string" ? errorMsg : "Delhivery cancellation failed",
    };
  }

  return {
    success: true,
    message: resData?.remark || resData?.rmk || resData?.message || `Shipment ${cleanWaybill} successfully cancelled in Delhivery.`,
  };
}
