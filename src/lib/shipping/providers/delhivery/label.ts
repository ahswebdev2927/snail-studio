import { getDelhiveryConfig } from "./config";

export interface GenerateLabelResult {
  pdfUrl: string;
  base64Pdf?: string;
  waybillsFound: number;
}

/**
 * Generates shipping label (packing slip) PDF for waybills from Delhivery.
 * Endpoint: GET /api/p/packing_slip?wbns={waybills}&pdf=true&pdf_size={pdfSize}
 */
export async function generateDelhiveryLabel(
  waybills: string[],
  pdfSize: "A4" | "4R" = "A4"
): Promise<GenerateLabelResult> {
  const config = getDelhiveryConfig();
  const cleanWaybills = waybills.map((w) => w.trim()).filter(Boolean);

  if (!cleanWaybills.length) {
    throw new Error("At least one waybill number is required to generate shipping label.");
  }

  const wbnsParam = cleanWaybills.join(",");
  const url = `${config.baseUrl}/api/p/packing_slip?wbns=${wbnsParam}&pdf=true&pdf_size=${pdfSize}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Token ${config.apiToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Delhivery Generate Label HTTP Error ${response.status}: ${errorText}`);
  }

  const resData = await response.json();

  const packagesFound = resData?.packages_found || 0;
  const packageItem = resData?.packages?.[0];

  if (!packagesFound || !packageItem || !packageItem.pdf_download_link) {
    throw new Error(`Shipping label generation failed: No label package found for waybill(s) '${wbnsParam}'.`);
  }

  return {
    pdfUrl: packageItem.pdf_download_link,
    base64Pdf: packageItem.pdf_encoding || undefined,
    waybillsFound: packagesFound,
  };
}
