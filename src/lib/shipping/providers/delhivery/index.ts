import {
  ShippingProvider,
  CancelShipmentRequest,
} from "../../types";
import { checkDelhiveryServiceability } from "./serviceability";
import { fetchDelhiveryWaybill } from "./waybill";
import { createDelhiveryShipment } from "./shipment";
import { trackDelhiveryShipment } from "./tracking";

export async function cancelDelhiveryShipment(req: CancelShipmentRequest): Promise<{ success: boolean; message?: string }> {
  throw new Error("Delhivery Shipment Cancellation API endpoint implementation in progress.");
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
export * from "./tracking";
