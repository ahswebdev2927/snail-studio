import { getDelhiveryConfig } from "./config";

/**
 * Fetches single or bulk waybill tracking numbers from Delhivery.
 * @param count Number of waybills to fetch (default: 1 for single fetch).
 */
export async function fetchDelhiveryWaybill(count: number = 1): Promise<string[]> {
  const config = getDelhiveryConfig();

  if (count <= 1) {
    // Single Fetch Waybill API
    const url = `${config.baseUrl}/waybill/api/fetch/json/?token=${config.apiToken}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Token ${config.apiToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Delhivery Fetch Single Waybill error: ${res.status} ${res.statusText}`);
    }

    const text = await res.text();
    // Delhivery returns the waybill string, e.g. "123456789012"
    const cleanedWaybill = text.trim().replace(/^"|"$/g, "");

    if (!cleanedWaybill) {
      throw new Error("Delhivery Fetch Waybill returned empty waybill string");
    }

    return [cleanedWaybill];
  } else {
    // Bulk Fetch Waybill API
    const url = `${config.baseUrl}/waybill/api/bulk/json/?count=${count}&token=${config.apiToken}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Token ${config.apiToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Delhivery Bulk Fetch Waybill error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const waybills: string[] = data?.waybills || [];

    if (!waybills.length) {
      throw new Error("Delhivery Bulk Fetch Waybill returned no waybills");
    }

    return waybills;
  }
}
