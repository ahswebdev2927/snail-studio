import { ServiceabilityRequest, ServiceabilityResult } from "../../types";
import { getDelhiveryConfig } from "./config";

export async function checkDelhiveryServiceability(
  req: ServiceabilityRequest
): Promise<ServiceabilityResult> {
  const config = getDelhiveryConfig();
  const cleanPincode = req.pincode.trim().replace(/\s+/g, "");

  if (!cleanPincode || cleanPincode.length !== 6 || !/^\d{6}$/.test(cleanPincode)) {
    return {
      isServiceable: false,
      courierName: "Delhivery",
      pincode: cleanPincode,
      prepaidAvailable: false,
      remarks: "Invalid 6-digit Indian pincode format",
    };
  }

  try {
    // 1. Query Pincode Serviceability API
    const serviceUrl = `${config.baseUrl}/c/api/pin-codes/json/?filter_codes=${cleanPincode}`;
    const serviceRes = await fetch(serviceUrl, {
      method: "GET",
      headers: {
        Authorization: `Token ${config.apiToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!serviceRes.ok) {
      console.error(`Delhivery serviceability API error: ${serviceRes.status} ${serviceRes.statusText}`);
      return {
        isServiceable: false,
        courierName: "Delhivery",
        pincode: cleanPincode,
        prepaidAvailable: false,
        remarks: `Delhivery API HTTP error: ${serviceRes.status}`,
      };
    }

    const serviceData = await serviceRes.json();
    const codes = serviceData?.delivery_codes || [];

    // Empty list or embargo status indicates non-serviceable
    if (!codes.length) {
      return {
        isServiceable: false,
        courierName: "Delhivery",
        pincode: cleanPincode,
        prepaidAvailable: false,
        remarks: "Pincode is non-serviceable (NSZ)",
      };
    }

    const pincodeObj = codes[0]?.postal_code;
    const remark = pincodeObj?.remarks || pincodeObj?.remark || "";
    const isEmbargo = remark.toLowerCase().includes("embargo");
    const isPrepaidServiceable = pincodeObj?.pre_paid === "Y" || pincodeObj?.prepaid === "Y";

    if (isEmbargo || !isPrepaidServiceable) {
      return {
        isServiceable: false,
        courierName: "Delhivery",
        pincode: cleanPincode,
        prepaidAvailable: isPrepaidServiceable,
        remarks: isEmbargo ? "Pincode is under temporary embargo" : "Prepaid service unavailable for pincode",
      };
    }

    // 2. Query Expected TAT API for estimated delivery days
    let estimatedDeliveryDays: number | undefined = undefined;
    try {
      const tatUrl = `${config.baseUrl}/api/dc/expected_tat?origin_pin=${config.originPincode}&destination_pin=${cleanPincode}&mot=S&pdt=B2C`;
      const tatRes = await fetch(tatUrl, {
        method: "GET",
        headers: {
          Authorization: `Token ${config.apiToken}`,
          "Content-Type": "application/json",
        },
      });

      if (tatRes.ok) {
        const tatData = await tatRes.json();
        if (tatData?.success && typeof tatData?.data?.tat === "number") {
          estimatedDeliveryDays = tatData.data.tat;
        } else if (typeof tatData?.tat === "number") {
          estimatedDeliveryDays = tatData.tat;
        }
      }
    } catch (tatErr) {
      console.warn("Delhivery Expected TAT fetch failed, defaulting to estimated days:", tatErr);
    }

    return {
      isServiceable: true,
      courierName: "Delhivery",
      pincode: cleanPincode,
      prepaidAvailable: true,
      estimatedDeliveryDays: estimatedDeliveryDays || 5,
      remarks: "Pincode is serviceable for prepaid delivery",
    };
  } catch (error: any) {
    console.error("Error in checkDelhiveryServiceability:", error);
    return {
      isServiceable: false,
      courierName: "Delhivery",
      pincode: cleanPincode,
      prepaidAvailable: false,
      remarks: error?.message || "Serviceability lookup failed",
    };
  }
}
