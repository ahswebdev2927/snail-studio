export interface DelhiveryConfig {
  baseUrl: string;
  apiToken: string;
  pickupLocation: string;
  originPincode: string;
  sellerName: string;
}

export function getDelhiveryConfig(): DelhiveryConfig {
  const baseUrl = process.env.DELHIVERY_BASE_API_URL || "https://track.delhivery.com";
  const apiToken = process.env.DELHIVERY_API_TOKEN || "";
  const pickupLocation = process.env.DELHIVERY_PICKUP_LOCATION || "Snailstudio Pvt Ltd";
  const originPincode = process.env.STORE_ORIGIN_PINCODE || "122003";
  const sellerName = process.env.STORE_NAME || "Snail Studio";

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiToken,
    pickupLocation,
    originPincode,
    sellerName,
  };
}
