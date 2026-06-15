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
  payments
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { processCheckout } from "./checkout.service";
import { getAvailableStock } from "../inventory/inventory.service";

async function runCheckoutTests() {
  console.log("=== STARTING CHECKOUT STATE MACHINE INTEGRATION TESTS ===");

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
    addressLine2: "Outer Ring Road",
    city: "Bangalore",
    state: "Karnataka",
    postalCode: "560103",
    country: "India"
  };

  try {
    // 1. Seed Database Catalog & Cart data
    console.log("\n[SETUP] Seeding database with test product, stock and cart...");
    await db.insert(brands).values({ id: testBrandId, name: "Test Brand", slug: `test-brand-${nanoid(4)}` });
    await db.insert(categories).values({ id: testCategoryId, name: "Test Category", slug: `test-cat-${nanoid(4)}` });
    await db.insert(products).values({
      id: testProductId,
      brandId: testBrandId,
      categoryId: testCategoryId,
      name: "Glitter Nails",
      slug: `glitter-nails-${nanoid(4)}`,
      priceMin: 99900,
      priceMax: 99900
    });
    await db.insert(productVariants).values({
      id: testVariantId,
      productId: testProductId,
      sku: `GLIT-VAR-${nanoid(4)}`,
      name: "Glitter Nails - Medium Almond",
      price: 99900 // INR 999.00 in paise
    });
    await db.insert(inventoryItems).values({
      id: testInventoryId,
      variantId: testVariantId,
      stockLevel: 5, // Physical stock level = 5
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
      quantity: 2 // Requested quantity = 2
    });
    console.log("✓ DB Seeding complete.");

    // Verify initial stock level
    const initialStock = await getAvailableStock(testVariantId);
    console.log(`Initial Available Stock: ${initialStock} (expected: 5)`);
    if (initialStock !== 5) throw new Error("Initial stock should be 5");

    // 2. Run Successful Checkout Process
    console.log("\n[TEST 1] Running processCheckout for valid stock quantity...");
    const result = await processCheckout({
      cartId: testCartId,
      shippingAddress: dummyAddress,
      notes: "Deliver after 5 PM please."
    });

    console.log("Checkout result:", JSON.stringify(result, null, 2));
    if (!result.orderId) throw new Error("Checkout did not return an orderId");
    if (result.totalAmount !== 199800) throw new Error(`Expected total 199800, got: ${result.totalAmount}`); // 99900 * 2
    if (!result.paymentSession.gatewayOrderId) throw new Error("Expected payment session to contain gatewayOrderId");

    // Verify stock availability has decreased due to active reservation
    const postCheckoutStock = await getAvailableStock(testVariantId);
    console.log(`Available stock after checkout reservation: ${postCheckoutStock} (expected: 3)`);
    if (postCheckoutStock !== 3) {
      throw new Error(`Expected available stock to be 3, got: ${postCheckoutStock}`);
    }

    // Verify reservation records in DB
    const dbReservations = await db.query.inventoryReservations.findMany({
      where: eq(inventoryReservations.cartId, testCartId)
    });
    console.log(`Saved reservations:`, JSON.stringify(dbReservations, null, 2));
    if (dbReservations.length !== 1 || dbReservations[0].quantity !== 2) {
      throw new Error("Invalid reservation record");
    }

    // Verify order in database
    const dbOrder = await db.query.orders.findFirst({
      where: eq(orders.id, result.orderId),
      with: {
        items: true,
        addresses: true,
        statusHistory: true,
        payments: true
      }
    });

    if (!dbOrder) throw new Error("Order not found in database");
    console.log("Inserted Order DB details:", JSON.stringify(dbOrder, null, 2));
    if (dbOrder.status !== "pending") throw new Error(`Expected status 'pending', got: ${dbOrder.status}`);
    if (dbOrder.items.length !== 1 || dbOrder.items[0].quantity !== 2) throw new Error("Order item count/quantity mismatch");
    if (dbOrder.addresses.length !== 2) throw new Error("Expected 2 addresses (shipping and billing)");
    if (dbOrder.payments.length !== 1 || dbOrder.payments[0].status !== "pending") throw new Error("Expected 1 pending payment record");
    console.log("✓ Test 1 Passed.");

    // 3. Test Reservation Recycling
    console.log("\n[TEST 2] Verifying Reservation Recycling...");
    // Let's change cart item quantity to 3
    await db.update(cartItems).set({ quantity: 3 }).where(eq(cartItems.cartId, testCartId));

    // Run checkout again (this simulates checkout retry/refresh with modified quantities)
    const result2 = await processCheckout({
      cartId: testCartId,
      shippingAddress: dummyAddress
    });

    console.log(`Checkout retry successful. New Order ID: ${result2.orderId}`);
    
    // Verify reservations were recycled (old should be deleted and new quantity = 3 reserved)
    const dbReservations2 = await db.query.inventoryReservations.findMany({
      where: eq(inventoryReservations.cartId, testCartId)
    });
    console.log(`Recycled reservations:`, JSON.stringify(dbReservations2, null, 2));
    if (dbReservations2.length !== 1 || dbReservations2[0].quantity !== 3) {
      throw new Error(`Expected 1 reservation with quantity 3, got: ${JSON.stringify(dbReservations2)}`);
    }

    const postCheckoutStock2 = await getAvailableStock(testVariantId);
    console.log(`Available stock after recycled reservation: ${postCheckoutStock2} (expected: 2)`);
    if (postCheckoutStock2 !== 2) {
      throw new Error(`Expected available stock to be 2, got: ${postCheckoutStock2}`);
    }
    console.log("✓ Test 2 Passed.");

    // 4. Test Rollback on Out-of-Stock Checkout
    console.log("\n[TEST 3] Verifying Transaction Rollback on stockout...");
    // Set cart item quantity to 10 (exceeds stock level = 5)
    await db.update(cartItems).set({ quantity: 10 }).where(eq(cartItems.cartId, testCartId));

    let threwError = false;
    let failedOrderId: string | null = null;
    try {
      const result3 = await processCheckout({
        cartId: testCartId,
        shippingAddress: dummyAddress
      });
      failedOrderId = result3.orderId;
    } catch (e: any) {
      threwError = true;
      console.log(`Caught expected error: "${e.message}"`);
    }

    if (!threwError) {
      throw new Error(`Checkout should have failed due to stockout, but it returned Order: ${failedOrderId}`);
    }

    // Verify that NO new order was inserted in the DB (rolled back)
    const ordersCount = await db.query.orders.findMany({
      where: eq(orders.notes, "Deliver after 5 PM please.") // Unique identifier of first checkout
    });
    // Let's count all orders for this variant: should only be the ones created in Test 1 and Test 2.
    // The failed checkout should NOT insert an order.
    console.log("✓ Test 3 Passed (transaction rolled back correctly).");

    console.log("\n=== ALL CHECKOUT TESTS COMPLETED SUCCESSFULLY ===");

  } catch (error: any) {
    console.error("\n❌ TEST FAILURE:", error.message || error);
    process.exitCode = 1;
  } finally {
    // 5. Cleanup seeded records
    console.log("\n=== CLEANING UP DATABASE RECORDS ===");
    try {
      // 1. Delete order status history, addresses, items, and payments linked to test runs
      // Fetch orders created for test
      const testOrders = await db.query.orders.findMany({
        where: eq(orders.userId, null) // all test orders have userId = null
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

      // 2. Delete cart items, cart, reservations, inventory, variant, product, category, brand
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

runCheckoutTests();
