import { NextResponse } from "next/server";
import { checkDelhiveryServiceability, calculateDelhiveryShippingCost } from "@/lib/shipping";
import { getShippingSettings } from "@/services/shipping/shipping-policy.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pincode = searchParams.get("pincode")?.trim() || "";
    const weightGrams = parseInt(searchParams.get("weightGrams") || "500", 10);
    const subtotalPaise = parseInt(searchParams.get("subtotalPaise") || "0", 10);

    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid 6-digit Indian PIN code." },
        { status: 400 }
      );
    }

    // 1. Fetch system shipping policy settings
    const settings = await getShippingSettings();

    // 2. Check Delhivery Serviceability
    let serviceability: { isServiceable: boolean; remarks?: string; courierName?: string; estimatedDeliveryDays?: number };
    try {
      serviceability = await checkDelhiveryServiceability({ pincode });
    } catch (err: any) {
      serviceability = { isServiceable: false, remarks: err.message };
    }

    let isFallback = false;
    if (!serviceability.isServiceable) {
      if (settings.shippingFallbackMode === "default_charges") {
        isFallback = true;
        serviceability = {
          isServiceable: true,
          courierName: "Standard Delivery (Fallback)",
          estimatedDeliveryDays: 6,
          remarks: "Serviceable via Standard Shipping (Default Charges)",
        };
      } else {
        return NextResponse.json({
          success: true,
          isServiceable: false,
          pincode,
          courierName: "Delhivery",
          remarks: serviceability.remarks || "Pincode is currently non-serviceable by courier partner.",
        });
      }
    }

    // 3. Compute Estimated Delivery Date range using Delhivery Expected TAT
    const tatDays = serviceability.estimatedDeliveryDays || 5;
    const minDays = Math.max(2, tatDays - 1);
    const maxDays = tatDays + 1;

    const today = new Date();
    const addDays = (date: Date, days: number) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };

    const minDate = addDays(today, minDays);
    const maxDate = addDays(today, maxDays);

    const options: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };
    const dateStr = `${minDate.toLocaleDateString("en-IN", options)} – ${maxDate.toLocaleDateString("en-IN", options)}`;

    // 4. Calculate Standard Freight Rate
    let standardFeeRupees = settings.defaultPrepaidShipping || 70;
    let expressFeeRupees = 250;

    if (!isFallback) {
      try {
        const standardCost = await calculateDelhiveryShippingCost({
          destinationPincode: pincode,
          shippingMode: "Surface",
          weightGrams,
        });
        if (standardCost && typeof standardCost.totalAmountRupees === "number" && standardCost.totalAmountRupees > 0) {
          standardFeeRupees = Math.round(standardCost.totalAmountRupees);
        }
      } catch (costErr) {
        console.warn("Delhivery surface cost estimation API fallback:", costErr);
      }

      try {
        const expressCost = await calculateDelhiveryShippingCost({
          destinationPincode: pincode,
          shippingMode: "Express",
          weightGrams,
        });
        if (expressCost && typeof expressCost.totalAmountRupees === "number" && expressCost.totalAmountRupees > 0) {
          expressFeeRupees = Math.round(expressCost.totalAmountRupees);
        } else {
          expressFeeRupees = Math.round(standardFeeRupees * 1.8);
        }
      } catch (costErr) {
        console.warn("Delhivery express cost estimation API fallback:", costErr);
        expressFeeRupees = Math.round(standardFeeRupees * 1.8);
      }
    } else {
      expressFeeRupees = Math.round(standardFeeRupees * 1.8);
    }

    const freeThresholdPaise = 99900; // Free shipping above ₹999
    const isFreeShippingEligible = subtotalPaise >= freeThresholdPaise;
    const finalStandardFeeRupees = isFreeShippingEligible ? 0 : standardFeeRupees;

    return NextResponse.json({
      success: true,
      isServiceable: true,
      isFallback,
      pincode,
      courierName: serviceability.courierName || "Delhivery",
      tatDays,
      estimatedDays: `${minDays}–${maxDays} business days`,
      minDeliveryDate: minDate.toISOString(),
      maxDeliveryDate: maxDate.toISOString(),
      dateStr,
      prepaidAvailable: true,
      codAvailable: false, // Cash on Delivery disabled per store policy
      standardShippingFeeRupees: finalStandardFeeRupees,
      rawStandardShippingFeeRupees: standardFeeRupees,
      expressShippingFeeRupees: expressFeeRupees,
      isFreeShippingEligible,
      remarks: serviceability.remarks || "Serviceable via Delhivery",
    });

  } catch (error: any) {
    console.error("GET /api/shipping/serviceability error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to check pincode serviceability." },
      { status: 500 }
    );
  }
}
