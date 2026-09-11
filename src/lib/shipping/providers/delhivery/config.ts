export interface DelhiveryConfig {
  baseUrl: string;
  apiToken: string;
  pickupLocation: string;
  originPincode: string;
  sellerName: string;
  isMockEnabled: boolean;
}

export function getDelhiveryConfig(): DelhiveryConfig {
  const baseUrl = process.env.DELHIVERY_BASE_API_URL || "https://track.delhivery.com";
  const apiToken = process.env.DELHIVERY_API_TOKEN || "";
  const pickupLocation = process.env.DELHIVERY_PICKUP_LOCATION || "Snailstudio Pvt Ltd";
  const originPincode = process.env.STORE_ORIGIN_PINCODE || "122003";
  const sellerName = process.env.STORE_NAME || "Snail Studio";

  // Mock mode is strictly forbidden in APP_ENV=production or NODE_ENV=production.
  const isProd = process.env.APP_ENV === "production" || process.env.NODE_ENV === "production";

  // In development, mock mode is ON by default unless explicitly disabled via MOCK_DELHIVERY=false or USE_REAL_DELHIVERY=true
  const isExplicitlyDisabled = process.env.MOCK_DELHIVERY === "false" || process.env.USE_REAL_DELHIVERY === "true";
  const isMockEnabled = !isProd && !isExplicitlyDisabled;

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiToken: apiToken || (isMockEnabled ? "DEV-MOCK-TOKEN" : ""),
    pickupLocation,
    originPincode,
    sellerName,
    isMockEnabled,
  };
}
