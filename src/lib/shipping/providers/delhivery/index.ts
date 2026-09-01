import {
  ShippingProvider,
  CancelShipmentRequest,
  TrackingResult,
} from "../../types";
import { checkDelhiveryServiceability } from "./serviceability";
import { fetchDelhiveryWaybill } from "./waybill";
import { createDelhiveryShipment } from "./shipment";

export async function cancelDelhiveryShipment(req: CancelShipmentRequest): Promise<{ success: boolean; message?: string }> {
  throw new Error("Delhivery Shipment Cancellation API endpoint implementation in progress.");
}

export async function trackDelhiveryShipment(waybill: string): Promise<TrackingResult> {
  throw new Error("Delhivery Shipment Tracking API endpoint implementation in progress.");
}

export const delhiveryShippingProvider: ShippingProvider = {
  providerId: "delhivery",
  checkServiceability: checkDelhiveryServiceability,
  createShipment: createDelhiveryShipment,
  cancelShipment: cancelDelhiveryShipment,
  trackShipment: trackDelhiveryShipment,
  fetchWaybill: fetchDelhiveryWaybill,
};

export * from "./config";
export * from "./serviceability";
export * from "./waybill";
export * from "./shipment";
