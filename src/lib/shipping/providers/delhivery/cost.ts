import { ShippingCostRequest, ShippingCostResult } from "../../types";
import { getDelhiveryConfig } from "./config";
import { delhiveryFetch } from "./client";

/**
 * Calculates estimated shipping freight charges from Delhivery Rate Calculator API.
 * Endpoint: GET /api/kinko/v1/invoice/charges/.json
 */
export async function calculateDelhiveryShippingCost(
  req: ShippingCostRequest
): Promise<ShippingCostResult> {
  const config = getDelhiveryConfig();
  const cleanDestPin = req.destinationPincode.trim().replace(/\s+/g, "");

  if (!cleanDestPin || cleanDestPin.length !== 6 || !/^\d{6}$/.test(cleanDestPin)) {
    throw new Error("Valid 6-digit destination pincode is required to calculate shipping cost.");
  }

  const mode = req.shippingMode === "Express" ? "E" : "S";
  const weightGrams = Math.max(10, req.weightGrams || 500);

  const queryParams = new URLSearchParams({
    md: mode,
    ss: "Delivered",
    d_pin: cleanDestPin,
    o_pin: config.originPincode || "122003",
    cgm: weightGrams.toString(),
    pt: "Pre-paid",
  });

  if (req.lengthCm) queryParams.append("l", req.lengthCm.toString());
  if (req.widthCm) queryParams.append("b", req.widthCm.toString());
  if (req.heightCm) queryParams.append("h", req.heightCm.toString());

  const resData = await delhiveryFetch({
    endpoint: `/api/kinko/v1/invoice/charges/.json?${queryParams.toString()}`,
    method: "GET",
  });
  const chargeData = Array.isArray(resData) ? resData[0] : resData;

  if (!chargeData || (typeof chargeData.total_amount !== "number" && typeof chargeData.gross_amount !== "number")) {
    throw new Error("Delhivery shipping cost calculation failed or returned invalid charge data.");
  }

  const totalAmount = chargeData.total_amount ?? chargeData.gross_amount ?? 0;
  const grossAmount = chargeData.gross_amount ?? totalAmount;

  return {
    totalAmountRupees: typeof totalAmount === "number" ? totalAmount : parseFloat(totalAmount) || 0,
    grossAmountRupees: typeof grossAmount === "number" ? grossAmount : parseFloat(grossAmount) || 0,
    currency: chargeData.currency || "INR",
    zone: chargeData.zone || undefined,
    chargedWeightGrams: chargeData.charged_weight ? Number(chargeData.charged_weight) : undefined,
    breakdown: {
      deliveryCharge: chargeData.charge_DL ?? 0,
      peakSurcharge: chargeData.charge_PEAK ?? 0,
      documentationCharge: chargeData.charge_DPH ?? 0,
      taxData: chargeData.tax_data || undefined,
      rawCharges: chargeData,
    },
  };
}
