import {
  ShippingProvider,
} from "../../types";
import { checkDelhiveryServiceability } from "./serviceability";
import { fetchDelhiveryWaybill } from "./waybill";
import { createDelhiveryShipment } from "./shipment";
import { trackDelhiveryShipment } from "./tracking";
import { cancelDelhiveryShipment } from "./cancellation";
import { generateDelhiveryLabel } from "./label";

export const delhiveryShippingProvider: ShippingProvider = {
  providerId: "delhivery",
  checkServiceability: checkDelhiveryServiceability,
  createShipment: createDelhiveryShipment,
  cancelShipment: cancelDelhiveryShipment,
  trackShipment: trackDelhiveryShipment,
  fetchWaybill: fetchDelhiveryWaybill,
  generateLabel: generateDelhiveryLabel,
};

export * from "./config";
export * from "./serviceability";
export * from "./waybill";
export * from "./shipment";
export * from "./tracking";
export * from "./cancellation";
export * from "./label";
