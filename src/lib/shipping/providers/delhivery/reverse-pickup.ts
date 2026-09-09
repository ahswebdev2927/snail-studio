import { CreateReversePickupRequest, CreateShipmentResult } from "../../types";
import { getDelhiveryConfig } from "./config";
import { delhiveryFetch } from "./client";

/**
 * Generates a reverse B2C shipment in Delhivery.
 * Endpoint: POST /api/cmu/create.json
 * Uses payment_mode = "Pickup", customer address as pickup location, warehouse as return destination.
 */
export async function createDelhiveryReversePickup(
  req: CreateReversePickupRequest
): Promise<CreateShipmentResult> {
  const config = getDelhiveryConfig();

  if (!config.apiToken) {
    throw new Error("Delhivery API Token is missing in environment configuration.");
  }

  // 1. Prepare Consignee (Customer Pickup) Address details
  const fullAddress = [req.pickupAddress.addressLine1, req.pickupAddress.addressLine2]
    .filter(Boolean)
    .join(", ")
    .trim();

  const pincodeInt = parseInt(req.pickupAddress.postalCode.trim(), 10);
  if (isNaN(pincodeInt)) {
    throw new Error(`Invalid pincode '${req.pickupAddress.postalCode}' provided for reverse pickup.`);
  }

  // 2. Prepare Return Warehouse (Destination) details
  const returnName = req.returnWarehouseAddress?.name || config.sellerName || "Snail Studio";
  const returnAdd = req.returnWarehouseAddress?.addressLine1 || "Snail Studio Warehouse, Plot 45, Sector 18";
  const returnCity = req.returnWarehouseAddress?.city || "Gurugram";
  const returnState = req.returnWarehouseAddress?.state || "Haryana";
  const returnPin = req.returnWarehouseAddress?.postalCode || config.originPincode || "122003";
  const returnPhone = req.returnWarehouseAddress?.phone || "+919999999999";
  const returnCountry = req.returnWarehouseAddress?.country || "India";

  // 3. Construct Delhivery Reverse Shipment Payload
  const shipmentData = {
    name: req.pickupAddress.name,
    add: fullAddress,
    pin: req.pickupAddress.postalCode.trim(),
    city: req.pickupAddress.city,
    state: req.pickupAddress.state,
    country: req.pickupAddress.country || "India",
    phone: req.pickupAddress.phone,
    order: req.requestId,
    payment_mode: "Pickup",

    return_name: returnName,
    return_add: returnAdd,
    return_city: returnCity,
    return_state: returnState,
    return_pin: returnPin,
    return_phone: returnPhone,
    return_country: returnCountry,

    products_desc: req.itemsDesc || "Returned Press-On Nails Set",
    hsn_code: "",
    cod_amount: "0",
    order_date: null,
    total_amount: "0",
    seller_name: config.sellerName || "Snail Studio",
    seller_inv: req.requestId,
    quantity: (req.quantity || 1).toString(),
    waybill: "",

    shipment_length: "15.0",
    shipment_width: "10.0",
    shipment_height: "5.0",
    weight: (req.weightGrams || 500).toString(),
    shipping_mode: "Surface",
    address_type: "home",
  };

  const payload = {
    shipments: [shipmentData],
    pickup_location: {
      name: config.pickupLocation,
    },
  };

  // 4. Construct Raw Format String Body
  const rawBody = `format=json&data=${JSON.stringify(payload)}`;

  const resData = await delhiveryFetch({
    endpoint: "/api/cmu/create.json",
    method: "POST",
    contentType: "text/plain",
    body: rawBody,
  });

  // 5. Validate Response Status & Extract Waybill
  const pkg = resData?.packages?.[0];
  const assignedWaybill = pkg?.waybill;

  const isRootSuccess = resData?.success === true && resData?.error !== true;
  const isPackageSuccess = pkg?.status === "Success";

  if (!assignedWaybill && (!isRootSuccess || !isPackageSuccess)) {
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
      errorMessage = "Reverse pickup creation rejected by Delhivery.";
    }

    throw new Error(`Delhivery Reverse Pickup Error: ${errorMessage}`);
  }

  if (!assignedWaybill) {
    throw new Error("Delhivery reverse pickup creation succeeded but no waybill number was returned in response.");
  }

  return {
    success: true,
    courierOrderId: req.requestId,
    waybill: assignedWaybill,
    trackingNumber: assignedWaybill,
    trackingUrl: `https://track.delhivery.com/track/package/${assignedWaybill}`,
    rawResponse: resData,
  };
}
