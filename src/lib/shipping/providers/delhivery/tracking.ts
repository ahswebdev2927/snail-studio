import { TrackingResult, TrackingScan } from "../../types";
import { getDelhiveryConfig } from "./config";
import { delhiveryFetch } from "./client";

/**
 * Normalizes Delhivery shipment status string into system status enum.
 * Maps Delhivery B2C Package Lifecycle Journey:
 * Ready To Ship / Pickup Scheduled -> 'pending'
 * In Transit (all transit scans)  -> 'in_transit'
 * Dispatched / Out for Delivery   -> 'out_for_delivery'
 * Delivered                       -> 'delivered'
 * Not Picked / NDR                -> 'ndr'
 * RTO                             -> 'rto'
 * Cancelled                       -> 'cancelled'
 */
export function normalizeDelhiveryStatus(
  statusStr: string,
  instructionsStr?: string,
  statusCode?: string
): 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'ndr' | 'cancelled' | 'rto' {
  const s = (statusStr || "").toLowerCase().trim();
  const inst = (instructionsStr || "").toLowerCase().trim();
  const code = (statusCode || "").toUpperCase().trim();

  // 1. Delivered
  if (s === "delivered" || code === "EOD-135" || inst.includes("delivered to consignee")) {
    return "delivered";
  }

  // 2. Out for Delivery
  if (
    inst.includes("out for delivery") ||
    code === "X-DDD3FD" ||
    (s === "dispatched" && (inst.includes("out for delivery") || inst.includes("call placed")))
  ) {
    return "out_for_delivery";
  }

  // 3. NDR / Exceptions / Not Picked
  if (
    s === "not picked" ||
    code === "X-PNP" ||
    s.includes("ndr") ||
    s.includes("undelivered") ||
    (inst.includes("not picked") && !inst.includes("picked up")) ||
    inst.includes("not received from client")
  ) {
    return "ndr";
  }

  // 4. RTO
  if (s.includes("rto") || s.includes("return to origin") || s.includes("returned")) {
    return "rto";
  }

  // 5. Cancelled
  if (s.includes("cancel")) {
    return "cancelled";
  }

  // 6. In-Transit / Picked Up
  if (
    s === "in transit" ||
    s === "dispatched" ||
    s === "picked up" ||
    code === "X-PPOM" ||
    inst.includes("picked up") ||
    inst.includes("shipment picked up") ||
    inst.includes("recieved at origin") ||
    inst.includes("received at facility") ||
    inst.includes("vehicle departed") ||
    inst.includes("trip arrived") ||
    inst.includes("added to bag") ||
    inst.includes("weight captured")
  ) {
    return "in_transit";
  }

  // 7. Ready to Ship / Scheduled for Pickup / Manifested
  if (
    s === "manifested" ||
    s === "pending" ||
    code === "FMPUR-101" ||
    code === "X-UCI" ||
    inst.includes("manifest uploaded") ||
    inst.includes("pickup scheduled")
  ) {
    return "pending";
  }

  return "in_transit";
}

/**
 * Fetches real-time tracking information from Delhivery API.
 * Endpoint: GET /api/v1/packages/json/?waybill={waybill}
 */
export async function trackDelhiveryShipment(waybill: string): Promise<TrackingResult> {
  const config = getDelhiveryConfig();
  const cleanWaybill = waybill.trim();

  if (!cleanWaybill) {
    throw new Error("Waybill number is required to track shipment.");
  }

  const resData = await delhiveryFetch({
    endpoint: `/api/v1/packages/json/?waybill=${cleanWaybill}`,
    method: "GET",
  });

  // Parse Delhivery ShipmentData array
  const shipmentWrapper = resData?.ShipmentData?.[0];
  const shipmentData = shipmentWrapper?.Shipment;

  if (!shipmentData) {
    return {
      waybill: cleanWaybill,
      currentStatus: "Pending Allocation",
      normalizedStatus: "pending",
      scans: [],
    };
  }

  const currentStatusRaw = shipmentData?.Status?.Status || "Manifested";
  const currentInstructions = shipmentData?.Status?.Instructions || "";
  const currentStatusCode = shipmentData?.Status?.StatusCode || "";

  const normalizedStatus = normalizeDelhiveryStatus(
    currentStatusRaw,
    currentInstructions,
    currentStatusCode
  );

  const scans: TrackingScan[] = Array.isArray(shipmentData?.Scans)
    ? shipmentData.Scans.map((scanItem: any) => {
        const detail = scanItem?.ScanDetail || scanItem;
        const rawDate = detail?.ScanDateTime || detail?.StatusDateTime || detail?.InstructionsDateTime;
        return {
          status: detail?.Scan || detail?.ScanType || "Status Update",
          location: detail?.ScannedLocation || detail?.ScannedLocationName || detail?.Location || "In Transit",
          description: detail?.Instructions || detail?.Comment || detail?.Scan || "Scan update",
          timestamp: rawDate ? new Date(rawDate) : new Date(),
        };
      })
    : [];

  return {
    waybill: cleanWaybill,
    currentStatus: currentInstructions || currentStatusRaw,
    normalizedStatus,
    origin: shipmentData?.Origin || undefined,
    destination: shipmentData?.Destination || undefined,
    scans,
  };
}
