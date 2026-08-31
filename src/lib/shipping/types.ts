export interface ServiceabilityRequest {
  pincode: string;
  paymentType?: 'Prepaid'; // Hardcoded to Prepaid per store requirements
  weightGrams?: number;
}

export interface ServiceabilityResult {
  isServiceable: boolean;
  courierName: string;
  pincode: string;
  prepaidAvailable: boolean;
  estimatedDeliveryDays?: number;
  remarks?: string;
}

export interface CreateShipmentRequest {
  orderId: string;
  courierOrderId: string;
  attemptNumber: number;
  address: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  orderDetails: {
    totalAmountPaise: number;
    paymentMode: 'Prepaid'; // Always Prepaid
    items: Array<{ name: string; sku: string; quantity: number; pricePaise: number }>;
    totalWeightGrams: number;
  };
}

export interface CreateShipmentResult {
  success: boolean;
  courierOrderId: string;
  waybill: string;
  trackingNumber: string;
  trackingUrl: string;
  labelUrl?: string;
  rawResponse?: any;
}

export interface CancelShipmentRequest {
  waybill: string;
  courierOrderId: string;
  reason?: string;
}

export interface TrackingScan {
  status: string;
  location: string;
  description: string;
  timestamp: Date;
}

export interface TrackingResult {
  waybill: string;
  currentStatus: string;
  normalizedStatus: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'ndr' | 'cancelled' | 'rto';
  origin?: string;
  destination?: string;
  scans: TrackingScan[];
}

export interface ShippingProvider {
  providerId: 'delhivery' | 'external';
  checkServiceability(req: ServiceabilityRequest): Promise<ServiceabilityResult>;
  createShipment(req: CreateShipmentRequest): Promise<CreateShipmentResult>;
  cancelShipment(req: CancelShipmentRequest): Promise<{ success: boolean; message?: string }>;
  trackShipment(waybill: string): Promise<TrackingResult>;
  fetchWaybill?(count?: number): Promise<string[]>;
  generateLabel?(waybills: string[]): Promise<{ pdfUrl: string }>;
  createPickup?(req: { locationName: string; pickupDate: string; packageCount: number }): Promise<{ success: boolean; pickupId?: string }>;
  updateNDR?(waybill: string, action: string, comments?: string): Promise<{ success: boolean }>;
}
