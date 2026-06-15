import { db } from "@/db";
import {
  brands,
  categories,
  products,
  productVariants,
  inventoryItems,
  carts,
  cartItems,
  orders,
  orderItems,
  orderAddresses,
  orderStatusHistory,
  inventoryReservations,
  inventoryTransactions,
  payments
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { processCheckout } from "@/services/checkout/checkout.service";
import { getAvailableStock } from "@/services/inventory/inventory.service";
import { confirmOrderPayment } from "@/services/payments/payment.service";

async function runConfirmTests() {
  console.log("=== STARTING PAYMENT CONFIRMATION STATE MACHINE TESTS ===");

  // Define test IDs
  const testBrandId = `brand_${nanoid(8)}`;
  const testCategoryId = `cat_${nanoid(8)}`;
  const testProductId = `prod_${nanoid(8)}`;
  const testVariantId = `var_${nanoid(8)}`;
  const testInventoryId = `inv_${nanoid(8)}`;
  const testCartId = `cart_${nanoid(8)}`;

  const dummyAddress = {
    name: "Jane Doe",
    phone: "+919999999999",
    addressLine1: "Flat 405, Orchid Heights",
    city: "Bangalore",
    state: "Karnataka",
    postalCode: "560103",
    country: "India"
  };

  try {
    // 1. Seed Database Catalog, Stock, and Cart
    console.log("\n[SETUP] Seeding database...");
    await db.insert(brands).values({ id: testBrandId, name: "Test Brand", slug: `test-brand-${nanoid(4)}` });
    await db.insert(categories).values({ id: testCategoryId, name: "Test Category", slug: `test-cat-${nanoid(4)}` });
    await db.insert(products).values({
      id: testProductId,
      brandId: testBrandId,
      categoryId: testCategoryId,
      name: "Confirm Glitter Nails",
      slug: `confirm-glitter-${nanoid(4)}`,
      priceMin: 99900,
      priceMax: 99900
    });
    await db.insert(productVariants).values({
      id: testVariantId,
      productId: testProductId,
      sku: `CON-VAR-${nanoid(4)}`,
      name: "Confirm Glitter Nails - Medium Almond",
      price: 99900
    });
    await db.insert(inventoryItems).values({
      id: testInventoryId,
      variantId: testVariantId,
      stockLevel: 10, // Starting stock level = 10
      lowStockThreshold: 1
    });
    await db.insert(carts).values({
      id: testCartId,
      userId: null,
      guestCartToken: `token_${nanoid(10)}`
    });
    await db.insert(cartItems).values({
      cartId: testCartId,
      variantId: testVariantId,
      quantity: 3 // Buy 3 items
    });
    console.log("✓ Seeding complete.");

    // 2. Run Checkout (Step 8.3 flow) to create a pending order and reservation
    console.log("\n[TEST Setup] Running checkout to create pending order and reserve stock...");
    const checkoutResult = await processCheckout({
      cartId: testCartId,
      shippingAddress: dummyAddress
    });

    const orderId = checkoutResult.orderId;
    const gatewayOrderId = checkoutResult.paymentSession.gatewayOrderId;
    console.log(`✓ Pending order created: ${orderId}, gatewayOrderId: ${gatewayOrderId}`);

    // Verify stock checks: available stock should be 7 (10 physical - 3 reserved)
    const availableStockPre = await getAvailableStock(testVariantId);
    console.log(`Available stock after reservation: ${availableStockPre} (expected: 7)`);
    if (availableStockPre !== 7) throw new Error("Stock count should be 7");

    // Verify reservation holds exist in DB
    const preReservations = await db.query.inventoryReservations.findMany({
      where: eq(inventoryReservations.cartId, testCartId)
    });
    if (preReservations.length !== 1 || preReservations[0].quantity !== 3) {
      throw new Error("Missing active reservations record");
    }

    // 3. Confirm Payment (Step 8.4 flow)
    console.log("\n[TEST 1] Running confirmOrderPayment (Payment Confirmation Flow)...");
    const mockPaymentId = `pay_mock_${nanoid(12)}`;
    
    const confirmResult = await confirmOrderPayment({
      orderId,
      paymentId: mockPaymentId,
      gatewayOrderId,
      cartId: testCartId
    });

    console.log("Confirmation response details:", JSON.stringify(confirmResult, null, 2));
    if (!confirmResult.success) throw new Error("Payment confirmation failed");
    if (confirmResult.alreadyPaid) throw new Error("Expected alreadyPaid to be false on first call");

    // 4. Verify Order Status transitioned to Paid
    const updatedOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        statusHistory: true,
        payments: true
      }
    });

    if (!updatedOrder) throw new Error("Order not found");
    console.log("Updated order DB details:", JSON.stringify(updatedOrder, null, 2));
    if (updatedOrder.status !== "paid") {
      throw new Error(`Expected order status 'paid', got: ${updatedOrder.status}`);
    }

    // Verify status history log
    const lastHistory = updatedOrder.statusHistory[updatedOrder.statusHistory.length - 1];
    if (lastHistory.status !== "paid" || !lastHistory.notes.includes("Payment verified")) {
      throw new Error("Invalid order status history log");
    }

    // Verify payment record updated to succeeded
    const updatedPayment = updatedOrder.payments[0];
    if (updatedPayment.status !== "succeeded" || updatedPayment.gatewayTransactionId !== mockPaymentId) {
      throw new Error("Payment record status or transaction ID not updated correctly");
    }

    // 5. Verify Reservations are released
    const postReservations = await db.query.inventoryReservations.findMany({
      where: eq(inventoryReservations.cartId, testCartId)
    });
    console.log("Active reservations count after payment:", postReservations.length);
    if (postReservations.length !== 0) {
      throw new Error("Reservations were not released (deleted) after payment confirmation");
    }

    // 6. Verify Physical stock is hard-deducted
    const dbInventory = await db.query.inventoryItems.findFirst({
      where: eq(inventoryItems.id, testInventoryId)
    });
    if (!dbInventory) throw new Error("Inventory item not found");
    console.log(`Physical stock level: ${dbInventory.stockLevel} (expected: 7)`);
    if (dbInventory.stockLevel !== 7) {
      throw new Error(`Expected physical stock to be 7, got: ${dbInventory.stockLevel}`);
    }

    // Available stock (physical - reservations) should also be 7
    const availableStockPost = await getAvailableStock(testVariantId);
    console.log(`Available stock level: ${availableStockPost} (expected: 7)`);
    if (availableStockPost !== 7) throw new Error("Available stock count should be 7");

    // 7. Verify Inventory Transactions log created
    const dbTransactions = await db.query.inventoryTransactions.findMany({
      where: eq(inventoryTransactions.inventoryItemId, testInventoryId)
    });
    console.log("Inventory transactions logged:", JSON.stringify(dbTransactions, null, 2));
    if (dbTransactions.length !== 1) {
      throw new Error("Expected exactly 1 inventory transaction log");
    }
    const txLog = dbTransactions[0];
    if (txLog.type !== "outbound" || txLog.quantity !== 3 || txLog.reference !== `order_${orderId}`) {
      throw new Error("Invalid inventory transaction log details");
    }

    // 8. Verify Cart is cleared of items
    const remainingCartItems = await db.query.cartItems.findMany({
      where: eq(cartItems.cartId, testCartId)
    });
    console.log("Remaining items in cart:", remainingCartItems.length);
    if (remainingCartItems.length !== 0) {
      throw new Error("Cart items were not cleared after successful checkout.");
    }
    console.log("✓ Test 1 Passed.");

    // 9. Test Idempotency: confirming the payment again should return success and alreadyPaid=true
    console.log("\n[TEST 2] Verifying confirmation idempotency...");
    const confirmResultIdempotency = await confirmOrderPayment({
      orderId,
      paymentId: mockPaymentId,
      gatewayOrderId,
      cartId: testCartId
    });

    console.log("Idempotent confirmation response:", JSON.stringify(confirmResultIdempotency, null, 2));
    if (!confirmResultIdempotency.success) throw new Error("Idempotent call failed");
    if (!confirmResultIdempotency.alreadyPaid) throw new Error("Expected alreadyPaid = true");

    // Verify stock has NOT decreased again (should still be 7)
    const dbInventoryIdempotent = await db.query.inventoryItems.findFirst({
      where: eq(inventoryItems.id, testInventoryId)
    });
    if (dbInventoryIdempotent?.stockLevel !== 7) {
      throw new Error(`Stock level changed on idempotent call: ${dbInventoryIdempotent?.stockLevel}`);
    }
    console.log("✓ Test 2 Passed.");

    console.log("\n=== ALL PAYMENT CONFIRMATION TESTS COMPLETED SUCCESSFULLY ===");

  } catch (error: any) {
    console.error("\n❌ TEST FAILURE:", error.message || error);
    process.exitCode = 1;
  } finally {
    // 10. Database Cleanup
    console.log("\n=== CLEANING UP DATABASE RECORDS ===");
    try {
      // Find orders created for test
      const testOrders = await db.query.orders.findMany({
        where: eq(orders.userId, null)
      });

      for (const orderRecord of testOrders) {
        // Find payments
        const paymentRecords = await db.query.payments.findMany({
          where: eq(payments.orderId, orderRecord.id)
        });
        for (const p of paymentRecords) {
          await db.delete(payments).where(eq(payments.id, p.id));
        }
        await db.delete(orderStatusHistory).where(eq(orderStatusHistory.orderId, orderRecord.id));
        await db.delete(orderAddresses).where(eq(orderAddresses.orderId, orderRecord.id));
        await db.delete(orderItems).where(eq(orderItems.orderId, orderRecord.id));
        await db.delete(orders).where(eq(orders.id, orderRecord.id));
      }

      await db.delete(inventoryTransactions).where(eq(inventoryTransactions.inventoryItemId, testInventoryId));
      await db.delete(inventoryReservations).where(eq(inventoryReservations.cartId, testCartId));
      await db.delete(cartItems).where(eq(cartItems.cartId, testCartId));
      await db.delete(carts).where(eq(carts.id, testCartId));
      await db.delete(inventoryItems).where(eq(inventoryItems.id, testInventoryId));
      await db.delete(productVariants).where(eq(productVariants.id, testVariantId));
      await db.delete(products).where(eq(products.id, testProductId));
      await db.delete(categories).where(eq(categories.id, testCategoryId));
      await db.delete(brands).where(eq(brands.id, testBrandId));

      console.log("✓ DB Cleanup complete.");
    } catch (cleanupError: any) {
      console.error("Warning: DB cleanup failed:", cleanupError.message || cleanupError);
    }
  }
}

runConfirmTests();
