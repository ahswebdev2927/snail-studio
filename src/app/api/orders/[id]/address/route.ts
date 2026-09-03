import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderAddresses, orderAddressHistory } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { nanoid } from "nanoid";
import { z } from "zod";
import { 
  recalculateShippingForOrder, 
  checkAddressLockStatus, 
  validatePincodeServiceability 
} from "@/services/shipping/shipping-policy.service";

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Admin-Only Permission Gate
    const auth = await authorize(req, "admin");
    if (!auth.authorized || !auth.user) {
      return auth.response || NextResponse.json(
        { error: "Forbidden: Only administrators can modify order delivery addresses." },
        { status: 403 }
      );
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

    // 2. Strict Pre-Shipment Address Lock Check
    const lockStatus = await checkAddressLockStatus(orderId);
    if (lockStatus.locked) {
      return NextResponse.json(
        { error: lockStatus.reason || "Address locked: Shipment/AWB has already been created for this order." },
        { status: 400 }
      );
    }

    // 3. Destination Pincode Serviceability Check
    const serviceability = await validatePincodeServiceability(postalCode);
    if (!serviceability.serviceable) {
      return NextResponse.json(
        { error: serviceability.message || `Destination pincode ${postalCode} is not serviceable by courier partner.` },
        { status: 400 }
      );
    }

    // 4. Execute Modifications within Database Transaction
    const responseResult = await db.transaction(async (tx) => {
      const order = await tx.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          addresses: true,
        },
      });

      if (!order) {
        return { status: 404, data: { error: "Order not found" } };
      }

      const oldShippingAddress = order.addresses.find((addr) => addr.type === "shipping");
      if (!oldShippingAddress) {
        return { status: 400, data: { error: "No shipping address record found for this order" } };
      }

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

      // Recalculate shipping rate against absorb threshold
      const recalculation = await recalculateShippingForOrder(orderId, {
        addressLine1,
        addressLine2: addressLine2 || undefined,
        city,
        state,
        postalCode,
        country,
      });

      // Update shipping address record
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

      // Update order totals and shipping stats
      const originalShipping = order.shippingCalculatedAt !== null
        ? (order.currentShippingCharge - order.shippingDifference)
        : (order.shippingChargePaid > 0 ? order.shippingChargePaid : order.shippingAmount);
      const newTotalAmount = Math.max(0, order.totalAmount + recalculation.totalAmountAdjustment);

      await tx.update(orders)
        .set({
          shippingAmount: recalculation.currentShippingCharge,
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

      // Insert audit log
      await tx.insert(orderAddressHistory).values({
        id: `oah_${nanoid(10)}`,
        orderId,
        version: order.addressVersion + 1,
        editedBy: `admin (${sessionUser.name || sessionUser.phoneNumber || "Admin"})`,
        oldAddress: oldAddressJson,
        newAddress: newAddressJson,
        shippingBefore: originalShipping,
        shippingAfter: recalculation.currentShippingCharge,
        difference: recalculation.shippingDifference,
        reason: reason || "Admin updated delivery address prior to shipment",
      });

      return {
        status: 200,
        data: {
          success: true,
          message: "Shipping address updated successfully",
          recalculation,
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
