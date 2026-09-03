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
  provider?: 'delhivery' | 'external';
  externalCourierName?: string;
  externalTrackingUrl?: string;
  externalMetadata?: string;
  address: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    addressType?: string;
  };
  orderDetails: {
    totalAmountPaise: number;
    paymentMode: 'Prepaid'; // Always Prepaid
    items: Array<{ name: string; sku: string; quantity: number; pricePaise: number }>;
    totalWeightGrams: number;
    shippingMode?: 'Surface' | 'Express';
  };
  adminOptions?: {
    sellerInvoiceNumber?: string;
    weightGrams?: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    fragileShipment?: boolean;
    plasticPackaging?: boolean;
    transportSpeed?: 'D' | 'F';
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
  reason: string;
  currentStatus?: string;
}

export interface RedispatchRequest {
  orderId: string;
  provider: 'delhivery' | 'external';
  reason: string;
  externalCourierName?: string;
  externalTrackingNumber?: string;
  externalTrackingUrl?: string;
  externalMetadata?: string;
  adminOptions?: CreateShipmentRequest['adminOptions'];
}

export interface TrackingSyncResult {
  totalSynced: number;
  updatedCount: number;
  skippedCount?: number;
  failedCount?: number;
  durationMs?: number;
  errors: Array<{ waybill: string; error: string }>;
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

export interface ShippingCostRequest {
  destinationPincode: string;
  weightGrams?: number;
  shippingMode?: 'Surface' | 'Express';
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export interface ShippingCostResult {
  totalAmountRupees: number;
  grossAmountRupees: number;
  currency: string;
  zone?: string;
  chargedWeightGrams?: number;
  breakdown?: any;
}

export interface ShippingProvider {
  providerId: 'delhivery' | 'external';
  checkServiceability(req: ServiceabilityRequest): Promise<ServiceabilityResult>;
  createShipment(req: CreateShipmentRequest): Promise<CreateShipmentResult>;
  cancelShipment(req: CancelShipmentRequest): Promise<{ success: boolean; message?: string }>;
  trackShipment(waybill: string): Promise<TrackingResult>;
  generateLabel?(waybills: string[], pdfSize?: 'A4' | '4R'): Promise<{ pdfUrl: string; base64Pdf?: string }>;
  createPickup?(req: { locationName?: string; pickupDate: string; pickupTime?: string; packageCount: number }): Promise<{ success: boolean; pickupId?: string; message?: string }>;
  calculateShippingCost?(req: ShippingCostRequest): Promise<ShippingCostResult>;
  updateNDR?(waybill: string, action: string, comments?: string): Promise<{ success: boolean }>;
}
