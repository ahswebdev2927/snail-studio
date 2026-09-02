import { getDelhiveryConfig } from "./config";
import { delhiveryFetch } from "./client";

export interface CreatePickupRequestOptions {
  locationName?: string;
  pickupDate: string; // YYYY-MM-DD
  pickupTime?: string; // hh:mm:ss (default: "14:00:00")
  packageCount: number;
}

export interface CreatePickupResult {
  success: boolean;
  pickupId?: string;
  message?: string;
  rawResponse?: any;
}

/**
 * Initiates a pickup request with Delhivery for manifested packages ready at warehouse.
 * Endpoint: POST /fm/request/new/
 */
export async function createDelhiveryPickup(
  req: CreatePickupRequestOptions
): Promise<CreatePickupResult> {
  const config = getDelhiveryConfig();

  const location = req.locationName?.trim() || config.pickupLocation;
  if (!location) {
    throw new Error("Pickup location warehouse name is required.");
  }

  const packageCount = Math.max(1, req.packageCount || 1);
  const pickupTime = req.pickupTime?.trim() || "14:00:00";
  const pickupDate = req.pickupDate.trim();

  const payload = {
    pickup_location: location,
    pickup_date: pickupDate,
    pickup_time: pickupTime,
    expected_package_count: packageCount,
  };

  const resData = await delhiveryFetch({
    endpoint: "/fm/request/new/",
    method: "POST",
    body: payload,
  });

  const isSuccess = resData?.status === true || resData?.success === true || resData?.status === "Success" || Boolean(resData?.pr_id || resData?.pickup_id);

  if (!isSuccess && (resData?.status === false || resData?.error)) {
    const errorMsg = resData?.rmk || resData?.error || resData?.message || "Delhivery rejected pickup request";
    return {
      success: false,
      message: typeof errorMsg === "string" ? errorMsg : "Pickup request failed",
      rawResponse: resData,
    };
  }

  const pickupId = resData?.pr_id || resData?.pickup_id || resData?.id || undefined;
  const message = resData?.message || resData?.rmk || `Pickup request created successfully for ${packageCount} package(s).`;

  return {
    success: true,
    pickupId: pickupId ? String(pickupId) : undefined,
    message,
    rawResponse: resData,
  };
}
