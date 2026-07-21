import { db } from "../../src/db";
import { 
  users, 
  orders, 
  orderItems, 
  orderAddresses, 
  payments, 
  refunds, 
  inventoryItems, 
  inventoryTransactions,
  productVariants
} from "../../src/db/schema";
import { eq, ne } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function seedPresentationData() {
  console.log("Seeding 2 months of presentation data (users, orders, payments, stock transactions)...");

  await db.transaction(async (tx) => {
    // 1. Clean up existing transaction & customer user data
    console.log("Cleaning up previous orders and customer data...");
    await tx.delete(refunds);
    await tx.delete(payments);
    await tx.delete(orderAddresses);
    await tx.delete(orderItems);
    await tx.delete(orders);
    await tx.delete(inventoryTransactions);
    await tx.delete(users).where(ne(users.role, "admin"));

    // 2. Generate 10 customer users with random registration dates in the last 60 days
    const userConfigs = [
      { name: "Majeeb Ahmad", email: "majeeb0910@gmail.com" },
      { name: "Can Yilmaz", email: "can495@mail4.uk" },
      { name: "Netno Smith", email: "netno464@instadde.uk" },
      { name: "Django Admin", email: "djangosuperuser@mail4.uk" },
      { name: "Ollama Assistant", email: "ollama.main@mail4.uk" },
      { name: "Aria Sterling", email: "aria.sterling@gmail.com" },
      { name: "Kabir Malhotra", email: "kabir.m@gmail.com" },
      { name: "Sofia Rodriguez", email: "sofia.rod@yahoo.com" },
      { name: "Ethan Hunt", email: "ethan.hunt@impossible.com" },
      { name: "Priya Sharma", email: "priya.sharma@hotmail.com" }
    ];

    const seededUsers: any[] = [];
    const now = Date.now();
    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;

    console.log("Creating 10 users on random registration dates...");
    for (let i = 0; i < userConfigs.length; i++) {
      const config = userConfigs[i];
      const userId = `usr_${nanoid(10)}`;
      const firebaseUid = `firebase_uid_customer_${i + 1}`;
      const phone = `+91900000000${i}`; // unique phone number E.164 format
      
      // Random signup date between 60 days ago and 45 days ago (so they have time to place orders)
      const signupOffset = 45 * 24 * 60 * 60 * 1000 + Math.random() * (15 * 24 * 60 * 60 * 1000);
      const signupDate = new Date(now - signupOffset);

      await tx.insert(users).values({
        id: userId,
        firebaseUid,
        phoneNumber: phone,
        whatsappNumber: phone,
        email: config.email,
        name: config.name,
        role: "customer",
        phoneVerified: true,
        marketingConsent: Math.random() > 0.4,
        isActive: true,
        createdAt: signupDate,
        updatedAt: signupDate,
      });

      seededUsers.push({ id: userId, name: config.name, phone, email: config.email, createdAt: signupDate });
    }

    // 3. Fetch all product variants to build orders
    const variants = await tx.query.productVariants.findMany({
      with: {
        product: true
      }
    });

    if (variants.length === 0) {
      throw new Error("No product variants found to build orders. Ensure products seed runs first.");
    }

    const fetchedInventoryItems = await tx.query.inventoryItems.findMany();
    const inventoryMap = new Map(fetchedInventoryItems.map(item => [item.variantId, item]));

    // 4. Generate ~45 orders spread over the last 60 days
    const orderCount = 45;
    const statuses = [
      ...Array(35).fill("delivered"),
      ...Array(3).fill("shipped"),
      ...Array(3).fill("processing"),
      ...Array(2).fill("refunded"),
      ...Array(1).fill("cancelled"),
      ...Array(1).fill("paid")
    ];

    console.log(`Generating ${orderCount} orders spread across 2 months...`);

    // Shuffle array utility
    const shuffle = (array: any[]) => array.sort(() => Math.random() - 0.5);
    const shuffledStatuses = shuffle([...statuses]);

    // Cities and addresses for India-bound presentation orders
    const shippingLocations = [
      { city: "Mumbai", state: "Maharashtra", address: "Flat 402, Sea Breeze, Bandra West", postal: "400050" },
      { city: "Bengaluru", state: "Karnataka", address: "12, 4th Cross, Indiranagar", postal: "560038" },
      { city: "New Delhi", state: "Delhi", address: "H-18, Green Park Extension", postal: "110016" },
      { city: "Hyderabad", state: "Telangana", address: "Plot 87, Jubilee Hills", postal: "500033" },
      { city: "Chennai", state: "Tamil Nadu", address: "24, Harrington Road, Chetpet", postal: "600031" },
      { city: "Pune", state: "Maharashtra", address: "Building C, Koregaon Park", postal: "411001" },
      { city: "Kolkata", state: "West Bengal", address: "9B, Ballygunge Circular Road", postal: "700019" }
    ];

    for (let i = 0; i < orderCount; i++) {
      const orderId = `ord_${nanoid(10)}`;
      const randomUser = seededUsers[Math.floor(Math.random() * seededUsers.length)];
      const status = shuffledStatuses[i % shuffledStatuses.length];

      // Pick a random order date between user signup date and now
      const userSignupMs = randomUser.createdAt.getTime();
      const orderTimeMs = userSignupMs + Math.random() * (now - userSignupMs);
      const orderDate = new Date(orderTimeMs);

      // Pick 1 to 3 unique variants for this order
      const numItems = Math.floor(Math.random() * 3) + 1;
      const selectedVariants: any[] = [];
      const usedIndices = new Set();
      while (selectedVariants.length < numItems) {
        const idx = Math.floor(Math.random() * variants.length);
        if (!usedIndices.has(idx)) {
          usedIndices.add(idx);
          selectedVariants.push(variants[idx]);
        }
      }

      // Calculate totals in paise
      let subtotal = 0;
      const itemsToInsert: any[] = [];

      for (const variant of selectedVariants) {
        const quantity = Math.floor(Math.random() * 2) + 1; // 1 or 2
        const price = variant.price;
        const discount = 0;
        subtotal += price * quantity;

        itemsToInsert.push({
          id: `ord_item_${nanoid(10)}`,
          orderId,
          variantId: variant.id,
          quantity,
          price,
          discount
        });
      }

      // Discounts and shipping calculations
      const hasDiscount = Math.random() > 0.7;
      const discountAmount = hasDiscount ? (Math.random() > 0.5 ? 20000 : 50000) : 0; // 200 INR or 500 INR in paise
      const netItemsAmount = Math.max(0, subtotal - discountAmount);
      
      // Free shipping above 2000 INR (200000 paise)
      const shippingAmount = netItemsAmount >= 200000 ? 0 : 15000; // 150 INR in paise
      const totalAmount = netItemsAmount + shippingAmount;
      const taxAmount = Math.round(netItemsAmount * 0.18); // 18% GST estimate portion

      // Insert Order
      await tx.insert(orders).values({
        id: orderId,
        userId: randomUser.id,
        status,
        totalAmount,
        taxAmount,
        shippingAmount,
        shippingChargePaid: (status !== "pending" && status !== "cancelled") ? shippingAmount : 0,
        discountAmount,
        couponCode: hasDiscount ? (discountAmount === 20000 ? "WELCOME200" : "SNAIL500") : null,
        notes: "Client presentation demo order.",
        createdAt: orderDate,
        updatedAt: orderDate,
      });

      // Insert Order Items
      for (const item of itemsToInsert) {
        await tx.insert(orderItems).values(item);
      }

      // Insert Shipping & Billing Address
      const location = shippingLocations[Math.floor(Math.random() * shippingLocations.length)];
      await tx.insert(orderAddresses).values({
        id: `ord_addr_${nanoid(10)}`,
        orderId,
        type: "shipping",
        name: randomUser.name,
        phone: randomUser.phone,
        addressLine1: location.address,
        city: location.city,
        state: location.state,
        postalCode: location.postal,
        country: "India",
        createdAt: orderDate,
        updatedAt: orderDate
      });

      // Insert Payment for non-cancelled / non-pending orders
      if (status !== "cancelled" && status !== "pending") {
        const paymentId = `pay_${nanoid(10)}`;
        await tx.insert(payments).values({
          id: paymentId,
          orderId,
          gateway: "razorpay",
          gatewayTransactionId: `pay_tx_${nanoid(10)}`,
          status: "succeeded",
          amount: totalAmount,
          currency: "INR",
          createdAt: orderDate
        });

        // Insert Refund if status is refunded
        if (status === "refunded") {
          await tx.insert(refunds).values({
            id: `ref_${nanoid(10)}`,
            paymentId,
            gatewayRefundId: `ref_tx_${nanoid(10)}`,
            amount: totalAmount,
            reason: "Customer changed mind before shipping.",
            status: "succeeded",
            createdAt: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000 * 2) // 2 days later
          });
        }
      }

      // Update inventory levels and log transactions
      for (const item of itemsToInsert) {
        const invItem = inventoryMap.get(item.variantId);
        if (invItem) {
          const newStock = Math.max(0, invItem.stockLevel - item.quantity);
          invItem.stockLevel = newStock; // update in memory map

          // Update database inventory stock
          await tx.update(inventoryItems)
            .set({ stockLevel: newStock, updatedAt: orderDate })
            .where(eq(inventoryItems.id, invItem.id));

          // Insert inventory transaction
          await tx.insert(inventoryTransactions).values({
            id: `inv_tx_${nanoid(10)}`,
            inventoryItemId: invItem.id,
            type: "outbound",
            quantity: item.quantity,
            reference: `Order ${orderId}`,
            createdAt: orderDate
          });
        }
      }
    }

    // 5. Audit Stock Levels and force some to be low stock for testing alerts
    console.log("Checking and forcing low stock levels for dashboard alerts...");
    const finalInventory = await tx.query.inventoryItems.findMany({
      with: {
        variant: true
      }
    });

    let lowStockAdjustedCount = 0;
    for (const item of finalInventory) {
      // If it's not an accessory and we haven't adjusted at least 4 items, let's force them to 2 units to trigger alerts
      const isAccessory = item.variant?.sku?.includes("-DEFAULT");
      if (!isAccessory && item.stockLevel > item.lowStockThreshold && lowStockAdjustedCount < 4) {
        const targetStock = 2;
        const adjustmentQty = item.stockLevel - targetStock;
        
        await tx.update(inventoryItems)
          .set({ stockLevel: targetStock, updatedAt: new Date() })
          .where(eq(inventoryItems.id, item.id));

        await tx.insert(inventoryTransactions).values({
          id: `inv_tx_${nanoid(10)}`,
          inventoryItemId: item.id,
          type: "adjustment",
          quantity: -adjustmentQty,
          reference: "Presentation stock calibration",
          createdAt: new Date()
        });

        lowStockAdjustedCount++;
      }
    }
  });

  console.log("2 months presentation seeding completed successfully!");
}
