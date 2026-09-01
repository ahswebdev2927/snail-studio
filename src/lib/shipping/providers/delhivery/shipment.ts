import { CreateShipmentRequest, CreateShipmentResult } from "../../types";
import { getDelhiveryConfig } from "./config";
import { fetchDelhiveryWaybill } from "./waybill";

/**
 * Generates a forward B2C Prepaid shipment in Delhivery.
 * Endpoint: POST /api/cmu/create.json
 */
export async function createDelhiveryShipment(
  req: CreateShipmentRequest
): Promise<CreateShipmentResult> {
  const config = getDelhiveryConfig();

  if (!config.apiToken) {
    throw new Error("Delhivery API Token is missing in environment configuration.");
  }

  // 1. Obtain a waybill number (fetch fresh waybill if not provided)
  const waybills = await fetchDelhiveryWaybill(1);
  const waybillNumber = waybills[0];

  if (!waybillNumber) {
    throw new Error("Failed to allocate a Waybill number for Delhivery shipment creation.");
  }

  // 2. Prepare Consignee Address details
  const fullAddress = [req.address.addressLine1, req.address.addressLine2]
    .filter(Boolean)
    .join(", ")
    .trim();

  const pincodeInt = parseInt(req.address.postalCode.trim(), 10);
  if (isNaN(pincodeInt)) {
    throw new Error(`Invalid pincode '${req.address.postalCode}' provided for shipment creation.`);
  }

  // 3. Prepare Product Description & Quantity
  const productsDesc = req.orderDetails.items.length > 0
    ? req.orderDetails.items.map((item) => `${item.name} (x${item.quantity})`).join(", ")
    : "Press-On Nails Set";

  const totalQuantity = req.orderDetails.items.reduce((sum, item) => sum + item.quantity, 0);

  // 4. Construct Delhivery Forward Shipment Payload (matching doc cURL schema)
  const shipmentData = {
    name: req.address.name,
    add: fullAddress,
    pin: req.address.postalCode.trim(),
    city: req.address.city,
    state: req.address.state,
    country: req.address.country || "India",
    phone: req.address.phone,
    order: req.courierOrderId,
    payment_mode: "Prepaid",
    
    // Default return fields expected by Delhivery (empty strings fallback to pickup location)
    return_pin: "",
    return_city: "",
    return_phone: "",
    return_add: "",
    return_state: "",
    return_country: "",

    products_desc: productsDesc,
    hsn_code: "",
    cod_amount: "0",
    order_date: null,
    total_amount: (req.orderDetails.totalAmountPaise / 100).toFixed(2),
    seller_add: "",
    seller_name: config.sellerName || "Snail Studio",
    seller_inv: req.adminOptions?.sellerInvoiceNumber || req.courierOrderId,
    quantity: totalQuantity.toString(),
    waybill: waybillNumber,

    // Metrics & Dimensions
    shipment_length: (req.adminOptions?.lengthCm || 15.0).toString(),
    shipment_width: (req.adminOptions?.widthCm || 10.0).toString(),
    shipment_height: (req.adminOptions?.heightCm || 5.0).toString(),
    weight: (req.adminOptions?.weightGrams || req.orderDetails.totalWeightGrams || 500).toString(),
    shipping_mode: req.orderDetails.shippingMode || "Surface",
    address_type: req.address.addressType || "home",

    // Handling Flags
    fragile_shipment: req.adminOptions?.fragileShipment ?? true,
    plastic_packaging: req.adminOptions?.plasticPackaging ?? false,
    transport_speed: req.adminOptions?.transportSpeed || "D",
  };

  const payload = {
    shipments: [shipmentData],
    pickup_location: {
      name: config.pickupLocation,
    },
  };

  // 5. Construct Raw Format String Body (raw text: format=json&data={...})
  const rawBody = `format=json&data=${JSON.stringify(payload)}`;

  const url = `${config.baseUrl}/api/cmu/create.json`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${config.apiToken}`,
      "Content-Type": "text/plain",
    },
    body: rawBody,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Delhivery Shipment Creation HTTP Error ${response.status}: ${errorText}`);
  }

  const resData = await response.json();

  // 6. Validate Response Status & Extract Errors
  const pkg = resData?.packages?.[0];
  const isRootSuccess = resData?.success === true && resData?.error !== true;
  const isPackageSuccess = pkg?.status === "Success";

  if (!isRootSuccess || !isPackageSuccess) {
    let errorMessage = resData?.rmk || resData?.error_message;

    if (!errorMessage && pkg) {
      if (Array.isArray(pkg.remarks)) {
        const activeRemarks = pkg.remarks.filter((r: any) => typeof r === "string" && r.trim().length > 0);
        if (activeRemarks.length > 0) {
          errorMessage = activeRemarks.join("; ");
        }
      } else if (typeof pkg.remarks === "string" && pkg.remarks.trim()) {
        errorMessage = pkg.remarks.trim();
      }
    }

    if (!errorMessage) {
      errorMessage = "Shipment creation rejected by Delhivery.";
    }

    throw new Error(`Delhivery Shipment Creation Error: ${errorMessage}`);
  }

  const assignedWaybill = pkg?.waybill || waybillNumber;

  return {
    success: true,
    courierOrderId: req.courierOrderId,
    waybill: assignedWaybill,
    trackingNumber: assignedWaybill,
    trackingUrl: `https://track.delhivery.com/track/package/${assignedWaybill}`,
    rawResponse: resData,
  };
}
