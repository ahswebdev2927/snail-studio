import { NextRequest, NextResponse } from "next/server";
import {
  getDeliveryNDRExceptions,
  getPickupExceptions,
  getRTOExceptions,
} from "@/services/shipping/exception.service";
import { db } from "@/db";
import { shipmentExceptions } from "@/db/schema";
import { eq, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Compute live metric counts for dashboard
    const ndrCountRes = await db
      .select({ value: count() })
      .from(shipmentExceptions)
      .where(eq(shipmentExceptions.exceptionType, "DELIVERY_NDR"));

    const pickupCountRes = await db
      .select({ value: count() })
      .from(shipmentExceptions)
      .where(eq(shipmentExceptions.exceptionType, "PICKUP_EXCEPTION"));

    const rtoCountRes = await db
      .select({ value: count() })
      .from(shipmentExceptions)
      .where(eq(shipmentExceptions.exceptionType, "RTO"));

    const metrics = {
      ndrCount: ndrCountRes[0]?.value || 0,
      pickupCount: pickupCountRes[0]?.value || 0,
      rtoCount: rtoCountRes[0]?.value || 0,
    };

    let exceptions: any[] = [];

    if (type === "DELIVERY_NDR") {
      exceptions = await getDeliveryNDRExceptions({ page, limit });
    } else if (type === "PICKUP_EXCEPTION") {
      exceptions = await getPickupExceptions({ page, limit });
    } else if (type === "RTO") {
      exceptions = await getRTOExceptions({ page, limit });
    } else {
      const [ndrList, pickupList, rtoList] = await Promise.all([
        getDeliveryNDRExceptions({ page, limit: 20 }),
        getPickupExceptions({ page, limit: 20 }),
        getRTOExceptions({ page, limit: 20 }),
      ]);
      exceptions = [...ndrList, ...pickupList, ...rtoList];
    }

    return NextResponse.json({
      success: true,
      metrics,
      exceptions,
    });
  } catch (error: any) {
    console.error("[API:Admin:Exceptions] Error fetching exceptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipment exceptions", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
