import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, shipments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const trackingNumber = searchParams.get("trackingNumber")?.trim() || "";
    const orderId = searchParams.get("orderId")?.trim() || "";
    const email = searchParams.get("email")?.trim() || "";
    const phone = searchParams.get("phone")?.trim() || "";

    let resolvedOrderId = "";

    // 1. Search by Tracking Number
    if (trackingNumber) {
      const shipmentRecord = await db.query.shipments.findFirst({
        where: eq(shipments.trackingNumber, trackingNumber),
      });

      if (!shipmentRecord) {
        return NextResponse.json(
          { error: "No shipment found with this tracking number" },
          { status: 404 }
        );
      }
      resolvedOrderId = shipmentRecord.orderId;
    } else if (orderId) {
      // 2. Search by Order Number, with optional verification by email or phone
      const orderRecord = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          user: true,
          addresses: true,
        },
      });

      if (!orderRecord) {
        return NextResponse.json(
          { error: "No order found with this order number" },
          { status: 404 }
        );
      }

      // If they provided email, verify email match
      if (email) {
        const userEmail = orderRecord.user?.email;
        if (!userEmail || userEmail.toLowerCase() !== email.toLowerCase()) {
          return NextResponse.json(
            { error: "Verification failed: Email does not match this order" },
            { status: 403 }
          );
        }
      }

      // If they provided phone, verify phone match against address phone or user phone
      if (phone) {
        const userPhone = orderRecord.user?.phoneNumber;
        const addressPhones = orderRecord.addresses.map((a) => a.phone.replace(/\s+/g, ""));
        const cleanPhone = phone.replace(/\s+/g, "");

        const phoneMatches = 
          (userPhone && userPhone.replace(/\s+/g, "").includes(cleanPhone)) ||
          addressPhones.some((p) => p.includes(cleanPhone));

        if (!phoneMatches) {
          return NextResponse.json(
            { error: "Verification failed: Phone number does not match this order" },
            { status: 403 }
          );
        }
      }

      // If both email and phone are empty, but the order ID is queried directly:
      // Since order ID (ord_nanoid) is cryptographic and non-guessable, we allow direct lookup,
      // but we will require email/phone verification for extra security in the UI if needed.
      resolvedOrderId = orderRecord.id;
    } else {
      return NextResponse.json(
        { error: "Please provide either a tracking number or an order number" },
        { status: 400 }
      );
    }

    // 3. Load full order details (items, shipments, events, addresses)
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, resolvedOrderId),
      with: {
        items: {
          with: {
            variant: {
              with: {
                product: {
                  with: {
                    media: {
                      with: {
                        media: true,
                      },
                      orderBy: (pm, { asc }) => [asc(pm.sortOrder)],
                    },
                  },
                },
              },
            },
          },
        },
        addresses: true,
        statusHistory: {
          orderBy: (sh, { desc }) => [desc(sh.createdAt)],
        },
        shipments: {
          with: {
            events: {
              orderBy: (e, { desc }) => [desc(e.timestamp)],
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order details not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, order }, { status: 200 });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("GET /api/track error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message || String(error) },
      { status: 500 }
    );
  }
}
