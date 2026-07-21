import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderAddresses, orderAddressHistory, shipments, trackingEvents, orderStatusHistory } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { nanoid } from "nanoid";
import { z } from "zod";
import { recalculateShippingForOrder, getShippingSettings } from "@/services/shipping/shipping-policy.service";

const addressSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  addressLine1: z.string().min(5),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(2),
  state: z.string().min(2),
  postalCode: z.string().min(5),
  country: z.string().min(2),
  reason: z.string().max(200).optional().nullable(),
});

const STATUS_ORDER = ["pending", "paid", "confirmed", "processing", "shipped", "delivered"];

function isStatusAllowed(currentStatus: string, cutoffStatus: string): boolean {
  if (cutoffStatus === "never") return false;
  
  const currentIndex = STATUS_ORDER.indexOf(currentStatus.toLowerCase());
  const cutoffIndex = STATUS_ORDER.indexOf(cutoffStatus.toLowerCase());
  
  if (currentIndex === -1 || cutoffIndex === -1) return false;
  return currentIndex <= cutoffIndex;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const sessionUser = auth.user;

    const { id: orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = addressSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, phone, addressLine1, addressLine2, city, state, postalCode, country, reason } = validation.data;
    const settings = await getShippingSettings();

    // Start Transaction
    const responseResult = await db.transaction(async (tx) => {
      // 1. Fetch order details
      const order = await tx.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          addresses: true,
        },
      });

      if (!order) {
        return { status: 404, data: { error: "Order not found" } };
      }

      const isAdmin = sessionUser.role === "admin";

      // 2. Validate ownership for customers
      if (!isAdmin && order.userId !== sessionUser.id) {
        return { status: 403, data: { error: "Forbidden: You do not own this order" } };
      }

      // 3. Fetch existing shipment (AWB) if any
      const activeShipment = await tx.query.shipments.findFirst({
        where: and(
          eq(shipments.orderId, orderId),
          ne(shipments.status, "cancelled")
        ),
      });

      // 4. Validate edit permissions based on AWB state and customer settings
      if (activeShipment) {
        if (!isAdmin) {
          return { status: 400, data: { error: "Address locked: A shipping airway bill (AWB) has already been generated." } };
        }
        if (!settings.adminCanEditAfterAwb) {
          return { status: 400, data: { error: "Address locked: Admin editing after AWB is disabled." } };
        }
      } else {
        // No AWB generated yet, check customer cutoff rules
        if (!isAdmin) {
          const isAllowed = isStatusAllowed(order.status, settings.customerAddressEditUntil);
          if (!isAllowed) {
            return {
              status: 400,
              data: { error: `Address locked: Customer editing is disabled after order transitions to status '${order.status}'.` }
            };
          }
        }
      }

      // 5. Retrieve current shipping address
      const oldShippingAddress = order.addresses.find((addr) => addr.type === "shipping");
      if (!oldShippingAddress) {
        return { status: 400, data: { error: "No shipping address record found for this order" } };
      }

      // Save old address details for history log
      const oldAddressJson = JSON.stringify({
        name: oldShippingAddress.name,
        phone: oldShippingAddress.phone,
        addressLine1: oldShippingAddress.addressLine1,
        addressLine2: oldShippingAddress.addressLine2,
        city: oldShippingAddress.city,
        state: oldShippingAddress.state,
        postalCode: oldShippingAddress.postalCode,
        country: oldShippingAddress.country,
      });

      const newAddressJson = JSON.stringify({
        name,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
      });

      // 6. Recalculate shipping
      const recalculation = await recalculateShippingForOrder(orderId, {
        addressLine1,
        addressLine2: addressLine2 || undefined,
        city,
        state,
        postalCode,
        country,
      });

      // 7. Execute modifications (Cancel AWB if active and override is enabled)
      if (activeShipment && isAdmin && settings.adminCanEditAfterAwb) {
        // Cancel AWB
        await tx.update(shipments)
          .set({ status: "cancelled" })
          .where(eq(shipments.id, activeShipment.id));

        await tx.insert(trackingEvents).values({
          id: `evt_${nanoid(10)}`,
          shipmentId: activeShipment.id,
          status: "cancelled",
          location: "Warehouse",
          description: "Airway bill (AWB) cancelled due to shipping address modification.",
          timestamp: new Date(),
        });

        await tx.insert(orderStatusHistory).values({
          id: `osh_${nanoid(10)}`,
          orderId,
          status: order.status,
          notes: `AWB #${activeShipment.trackingNumber} cancelled due to address changes.`,
        });
      }

      // 8. Update shipping address record
      await tx.update(orderAddresses)
        .set({
          name,
          phone,
          addressLine1,
          addressLine2: addressLine2 || null,
          city,
          state,
          postalCode,
          country,
          updatedAt: new Date(),
        })
        .where(eq(orderAddresses.id, oldShippingAddress.id));

      // 9. Update order totals and shipping stats
      const originalShipping = order.shippingCalculatedAt !== null
        ? (order.currentShippingCharge - order.shippingDifference)
        : (order.shippingChargePaid > 0 ? order.shippingChargePaid : order.shippingAmount);
      const newTotalAmount = Math.max(0, order.totalAmount + recalculation.totalAmountAdjustment);

      await tx.update(orders)
        .set({
          shippingAmount: recalculation.currentShippingCharge, // update shippingAmount for order
          currentShippingCharge: recalculation.currentShippingCharge,
          shippingDifference: recalculation.shippingDifference,
          shippingDifferenceStatus: recalculation.shippingDifferenceStatus,
          totalAmount: newTotalAmount,
          shippingCalculatedAt: new Date(),
          shippingVerified: true,
          addressVersion: order.addressVersion + 1,
          addressVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      // 10. Insert audit logs
      await tx.insert(orderAddressHistory).values({
        id: `oah_${nanoid(10)}`,
        orderId,
        version: order.addressVersion + 1,
        editedBy: isAdmin ? `admin (${sessionUser.name})` : `customer (${sessionUser.name})`,
        oldAddress: oldAddressJson,
        newAddress: newAddressJson,
        shippingBefore: originalShipping,
        shippingAfter: recalculation.currentShippingCharge,
        difference: recalculation.shippingDifference,
        reason: reason || "User requested update",
      });

      // 11. Optionally auto-regenerate new AWB
      let newShipmentId = null;
      if (activeShipment && isAdmin && settings.adminCanEditAfterAwb && settings.autoRegenerateAwb) {
        newShipmentId = `ship_${nanoid(10)}`;
        const newTrackingNumber = `TRK${nanoid(10).toUpperCase()}`;

        await tx.insert(shipments).values({
          id: newShipmentId,
          orderId,
          carrier: activeShipment.carrier,
          trackingNumber: newTrackingNumber,
          status: "ready_to_ship",
          shippedAt: null,
          estimatedDeliveryAt: activeShipment.estimatedDeliveryAt,
        });

        await tx.insert(trackingEvents).values({
          id: `evt_${nanoid(10)}`,
          shipmentId: newShipmentId,
          status: "ready_to_ship",
          location: "Warehouse",
          description: `New airway bill auto-generated for courier ${activeShipment.carrier}. Tracking #: ${newTrackingNumber}.`,
          timestamp: new Date(),
        });

        await tx.insert(orderStatusHistory).values({
          id: `osh_${nanoid(10)}`,
          orderId,
          status: order.status,
          notes: `New AWB auto-generated: ${newTrackingNumber} (${activeShipment.carrier}).`,
        });
      }

      return {
        status: 200,
        data: {
          success: true,
          message: "Address updated successfully",
          recalculation,
          newShipmentGenerated: !!newShipmentId,
        },
      };
    });

    return NextResponse.json(responseResult.data, { status: responseResult.status });

  } catch (error: any) {
    console.error("POST /api/orders/[id]/address error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
