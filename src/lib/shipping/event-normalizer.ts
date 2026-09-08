export interface NormalizedShipmentEvent {
  shipmentId: string;
  provider: 'delhivery' | 'external';
  awb: string;
  eventTime: Date;
  status: string;
  statusCode?: string;
  statusType?: string;
  scan?: string;
  instructions?: string;
  location?: string;
  dispatchCount?: number;
  rawPayload?: any;
}

/**
 * Normalizes raw carrier scan data into a unified canonical NormalizedShipmentEvent structure.
 */
export function normalizeDelhiveryEvent(
  shipmentId: string,
  waybill: string,
  scanData: any,
  parentShipmentData?: any
): NormalizedShipmentEvent {
  const detail = scanData?.ScanDetail || scanData || {};

  const rawStatus = detail?.Status || detail?.Scan || detail?.ScanType || parentShipmentData?.Status?.Status || "In Transit";
  const rawStatusCode = detail?.StatusCode || detail?.NSLCode || parentShipmentData?.Status?.StatusCode || "";
  const rawStatusType = detail?.StatusType || parentShipmentData?.Status?.StatusType || "";
  const rawInstructions = detail?.Instructions || detail?.Comment || parentShipmentData?.Status?.Instructions || "";
  const rawLocation = detail?.ScannedLocation || detail?.ScannedLocationName || detail?.Location || "";
  const rawScanDate = detail?.ScanDateTime || detail?.StatusDateTime || detail?.InstructionsDateTime || new Date();
  
  const dispatchCountRaw = parentShipmentData?.DispatchCount || detail?.DispatchCount;
  const dispatchCount = typeof dispatchCountRaw === "number" ? dispatchCountRaw : parseInt(dispatchCountRaw || "1", 10);

  return {
    shipmentId,
    provider: "delhivery",
    awb: waybill,
    eventTime: new Date(rawScanDate),
    status: rawStatus,
    statusCode: rawStatusCode ? String(rawStatusCode).trim().toUpperCase() : undefined,
    statusType: rawStatusType ? String(rawStatusType).trim().toUpperCase() : undefined,
    scan: detail?.Scan || detail?.ScanType || rawStatus,
    instructions: rawInstructions,
    location: rawLocation,
    dispatchCount: isNaN(dispatchCount) ? 1 : dispatchCount,
    rawPayload: scanData,
  };
}
