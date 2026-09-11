import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, products, productVariants, orders, orderItems, orderAddresses, shipments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  // Security Guard: Strictly return 404 in production environment
  if (process.env.APP_ENV === "production" || (process.env.NODE_ENV as string) === "production") {
    return new Response("Not Found", { status: 404 });
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Allow empty body
    }

    const isExpired = Boolean(body.expired);
    const phoneNumber = body.phoneNumber || "+919999988888";
    const now = new Date();
    // Fresh delivery (24h ago) vs Expired delivery (73h ago)
    const deliveryTimestamp = isExpired
      ? new Date(now.getTime() - 73 * 3600 * 1000)
      : new Date(now.getTime() - 24 * 3600 * 1000);

    // 1. Find or create customer user
    let user = await db.query.users.findFirst({
      where: eq(users.phoneNumber, phoneNumber),
    });

    if (!user) {
      const insertedUsers = await db
        .insert(users)
        .values({
          id: `usr_${nanoid(10)}`,
          firebaseUid: `dev-firebase-${nanoid(10)}`,
          phoneNumber,
          phoneVerified: true,
          role: "customer",
          isActive: true,
          name: "Development Test Customer",
          email: "dev-customer@snailstudio.local",
          lastLoginAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      user = insertedUsers[0];
    }

    // 2. Find or create test product & variant
    let product = await db.query.products.findFirst({
      where: eq(products.name, "Dev Test Press-On Nails Set"),
    });

    if (!product) {
      const insertedProducts = await db
        .insert(products)
        .values({
          id: `prod_dev_${nanoid(8)}`,
          name: "Dev Test Press-On Nails Set",
          slug: "dev-test-press-on-nails",
          description: "Test product for V3.2 returns lifecycle manual verification.",
          priceMin: 99900,
          priceMax: 99900,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      product = insertedProducts[0];
    }

    let variants = await db.query.productVariants.findMany({
      where: eq(productVariants.productId, product.id),
    });

    if (variants.length < 2) {
      // Create primary and secondary variant for replacement tests
      const var1 = await db
        .insert(productVariants)
        .values({
          id: `var_dev_1_${nanoid(6)}`,
          productId: product.id,
          sku: `DEV-NAIL-S-${nanoid(4)}`,
          name: "Small / Almond",
          price: 99900,
          status: "Active",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const var2 = await db
        .insert(productVariants)
        .values({
          id: `var_dev_2_${nanoid(6)}`,
          productId: product.id,
          sku: `DEV-NAIL-M-${nanoid(4)}`,
          name: "Medium / Coffin",
          price: 99900,
          status: "Active",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      variants = [var1[0], var2[0]];
    }

    // 3. Create Delivered Test Order
    const orderId = `ord_dev_${nanoid(8)}`;
    await db.insert(orders).values({
      id: orderId,
      userId: user.id,
      status: "delivered",
      totalAmount: 99900,
      taxAmount: 0,
      shippingAmount: 0,
      discountAmount: 0,
      createdAt: deliveryTimestamp,
      updatedAt: deliveryTimestamp,
    });

    // 4. Create Order Item
    const orderItemId = `item_dev_${nanoid(8)}`;
    await db.insert(orderItems).values({
      id: orderItemId,
      orderId,
      variantId: variants[0].id,
      quantity: 1,
      price: 99900,
      discount: 0,
    });

    // 5. Create Order Address
    await db.insert(orderAddresses).values({
      id: `addr_dev_${nanoid(8)}`,
      orderId,
      type: "shipping",
      name: user.name || "Dev Customer",
      phone: user.phoneNumber,
      addressLine1: "Flat 101, Test Residency",
      addressLine2: "Cyber City",
      city: "Gurugram",
      state: "Haryana",
      postalCode: "122002",
      country: "India",
      createdAt: now,
      updatedAt: now,
    });

    // 6. Create Delivered Shipment Record
    const shipmentId = `ship_dev_${nanoid(8)}`;
    await db.insert(shipments).values({
      id: shipmentId,
      orderId,
      carrier: "Delhivery",
      provider: "delhivery",
      courierOrderId: orderId,
      waybill: `DEV-FWD-${nanoid(8)}`,
      trackingNumber: `DEV-FWD-${nanoid(8)}`,
      trackingUrl: `https://track.delhivery.com/track/package/DEV-FWD-${nanoid(8)}`,
      status: "delivered",
      shippedAt: new Date(deliveryTimestamp.getTime() - 24 * 3600 * 1000),
      updatedAt: deliveryTimestamp,
      createdAt: deliveryTimestamp,
    });

    return NextResponse.json({
      success: true,
      message: `Test order created successfully (${isExpired ? "EXPIRED window" : "VALID 24h window"}).`,
      order: {
        id: orderId,
        userId: user.id,
        userPhone: user.phoneNumber,
        orderItemId,
        variantId: variants[0].id,
        replacementVariantId: variants[1].id,
        status: "delivered",
        deliveredAt: deliveryTimestamp.toISOString(),
        isExpired,
      },
    });
  } catch (error: any) {
    console.error("Dev seed test order error:", error);
    return NextResponse.json({ error: "Failed to seed test order", details: error.message }, { status: 500 });
  }
}
