import {
  ShippingProvider,
} from "../../types";
import { checkDelhiveryServiceability } from "./serviceability";
import { createDelhiveryShipment } from "./shipment";
import { trackDelhiveryShipment } from "./tracking";
import { cancelDelhiveryShipment } from "./cancellation";
import { generateDelhiveryLabel } from "./label";
import { createDelhiveryPickup } from "./pickup";
import { calculateDelhiveryShippingCost } from "./cost";

export const delhiveryShippingProvider: ShippingProvider = {
  providerId: "delhivery",
  checkServiceability: checkDelhiveryServiceability,
  createShipment: createDelhiveryShipment,
  cancelShipment: cancelDelhiveryShipment,
  trackShipment: trackDelhiveryShipment,
  generateLabel: generateDelhiveryLabel,
  createPickup: createDelhiveryPickup,
  calculateShippingCost: calculateDelhiveryShippingCost,
};

export * from "./config";
export * from "./client";
export * from "./serviceability";
export * from "./shipment";
export * from "./tracking";
export * from "./cancellation";
export * from "./label";
export * from "./pickup";
export * from "./cost";
