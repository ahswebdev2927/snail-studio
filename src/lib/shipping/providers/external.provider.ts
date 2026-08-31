import {
  ShippingProvider,
  ServiceabilityRequest,
  ServiceabilityResult,
  CreateShipmentRequest,
  CreateShipmentResult,
  CancelShipmentRequest,
  TrackingResult,
} from "../types";

export async function checkExternalServiceability(req: ServiceabilityRequest): Promise<ServiceabilityResult> {
  return {
    isServiceable: true,
    courierName: "External Courier",
    pincode: req.pincode,
    prepaidAvailable: true,
    remarks: "Manual external courier fallback dispatch",
  };
}

export async function createExternalShipment(req: CreateShipmentRequest): Promise<CreateShipmentResult> {
  return {
    success: true,
    courierOrderId: req.courierOrderId,
    waybill: req.courierOrderId,
    trackingNumber: req.courierOrderId,
    trackingUrl: "",
  };
}

export async function cancelExternalShipment(req: CancelShipmentRequest): Promise<{ success: boolean; message?: string }> {
  return {
    success: true,
    message: `External shipment ${req.courierOrderId} marked as cancelled`,
  };
}

export async function trackExternalShipment(waybill: string): Promise<TrackingResult> {
  return {
    waybill,
    currentStatus: "External Courier Dispatch",
    normalizedStatus: "in_transit",
    scans: [
      {
        status: "DISPATCHED",
        location: "Merchant Warehouse",
        description: "Package dispatched via external courier",
        timestamp: new Date(),
      },
    ],
  };
}

export const externalShippingProvider: ShippingProvider = {
  providerId: "external",
  checkServiceability: checkExternalServiceability,
  createShipment: createExternalShipment,
  cancelShipment: cancelExternalShipment,
  trackShipment: trackExternalShipment,
};
