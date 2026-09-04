import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { shipments, orders, orderAddresses } from "@/db/schema";
import { eq, and, like, or, gte, lte, desc, count } from "drizzle-orm";
import { authorize } from "@/middleware/auth";

// GET /api/admin/shipments - List and filter all shipments
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const offset = (page - 1) * limit;

    const q = searchParams.get("q")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const provider = searchParams.get("provider")?.trim() || "";
    const isExternal = searchParams.get("isExternal");
    const pincode = searchParams.get("pincode")?.trim() || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const conditions: any[] = [];

    if (status && status !== "all") {
      conditions.push(eq(shipments.status, status as any));
    }

    if (provider && provider !== "all") {
      conditions.push(eq(shipments.provider, provider as any));
    }

    if (isExternal === "true") {
      conditions.push(eq(shipments.isExternal, true));
    } else if (isExternal === "false") {
      conditions.push(eq(shipments.isExternal, false));
    }

    if (pincode) {
      conditions.push(eq(orderAddresses.postalCode, pincode));
    }

    if (startDate) {
      const startTimestamp = new Date(startDate);
      if (!isNaN(startTimestamp.getTime())) {
        conditions.push(gte(shipments.createdAt, startTimestamp));
      }
    }

    if (endDate) {
      const endTimestamp = new Date(endDate);
      if (!isNaN(endTimestamp.getTime())) {
        conditions.push(lte(shipments.createdAt, endTimestamp));
      }
    }

    if (q) {
      const searchPattern = `%${q}%`;
      conditions.push(
        or(
          like(shipments.id, searchPattern),
          like(shipments.orderId, searchPattern),
          like(shipments.courierOrderId, searchPattern),
          like(shipments.trackingNumber, searchPattern),
          like(shipments.waybill, searchPattern),
          like(shipments.carrier, searchPattern),
          like(orderAddresses.name, searchPattern),
          like(orderAddresses.phone, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total matching shipments
    const [totalRes] = await db
      .select({ total: count() })
      .from(shipments)
      .leftJoin(orderAddresses, and(
        eq(shipments.orderId, orderAddresses.orderId),
        eq(orderAddresses.type, "shipping")
      ))
      .where(whereClause);

    const totalItems = totalRes?.total || 0;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    // Retrieve paginated records joined with orders & shipping addresses
    const rawShipments = await db
      .select({
        shipment: shipments,
        order: {
          id: orders.id,
          status: orders.status,
          totalAmount: orders.totalAmount,
          createdAt: orders.createdAt,
        },
        address: {
          name: orderAddresses.name,
          phone: orderAddresses.phone,
          city: orderAddresses.city,
          state: orderAddresses.state,
          postalCode: orderAddresses.postalCode,
          country: orderAddresses.country,
        },
      })
      .from(shipments)
      .leftJoin(orders, eq(shipments.orderId, orders.id))
      .leftJoin(
        orderAddresses,
        and(eq(shipments.orderId, orderAddresses.orderId), eq(orderAddresses.type, "shipping"))
      )
      .where(whereClause)
      .orderBy(desc(shipments.createdAt))
      .limit(limit)
      .offset(offset);

    const formattedShipments = rawShipments.map((item) => ({
      ...item.shipment,
      orderStatus: item.order?.status || "unknown",
      orderTotalAmountPaise: item.order?.totalAmount || 0,
      customerName: item.address?.name || "Guest Customer",
      customerPhone: item.address?.phone || "N/A",
      destinationCity: item.address?.city || "N/A",
      destinationState: item.address?.state || "N/A",
      destinationPincode: item.address?.postalCode || "N/A",
    }));

    return NextResponse.json({
      success: true,
      shipments: formattedShipments,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/shipments error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
