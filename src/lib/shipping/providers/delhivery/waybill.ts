import { getDelhiveryConfig } from "./config";

/**
 * Fetches single or bulk waybill tracking numbers from Delhivery.
 * Delhivery returns a quoted comma-separated string, e.g. "41093210930285,41093210930296"
 * 
 * @param count Number of waybills to fetch (default: 1).
 */
export async function fetchDelhiveryWaybill(count: number = 1): Promise<string[]> {
  const config = getDelhiveryConfig();
  const requestedCount = Math.max(1, count);

  // Bulk / Single fetch URL
  const url = requestedCount === 1
    ? `${config.baseUrl}/waybill/api/fetch/json/?token=${config.apiToken}`
    : `${config.baseUrl}/waybill/api/bulk/json/?count=${requestedCount}&token=${config.apiToken}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Token ${config.apiToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Delhivery Fetch Waybill error: ${res.status} ${res.statusText}`);
  }

  const rawText = await res.text();
  
  // Clean quotes, brackets, and whitespace, then split by comma
  const cleanedText = rawText.trim().replace(/^"|"$/g, "").replace(/^\[|\]$/g, "");
  const waybills = cleanedText
    .split(",")
    .map((w) => w.trim().replace(/^"|"$/g, ""))
    .filter((w) => w.length > 0);

  if (!waybills.length) {
    throw new Error(`Delhivery Fetch Waybill returned no valid waybill numbers (raw response: ${rawText})`);
  }

  return waybills;
}
