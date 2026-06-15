import { db } from "@/db";
import { orders, payments, refunds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getPaymentProvider } from "./payment-factory";
import {
  createPaymentSession,
  verifyAndRecordPayment,
  refundOrderPayment
} from "@/services/payments/payment.service";

async function runTests() {
  console.log("=== STARTING PAYMENT ARCHITECTURE INTEGRATION TESTS ===");
  
  const testOrderId = `order_test_${nanoid(8)}`;
  let createdPaymentRecordId: string | null = null;

  try {
    // 1. Verify Payment Provider Factory resolves correctly
    console.log("\n[TEST 1] Verifying Factory and Provider Instantiation...");
    const provider = getPaymentProvider();
    console.log("Active Gateway configured in environment:", process.env.PAYMENT_GATEWAY);
    console.log("Resolved provider instance type:", provider.constructor.name);

    if (process.env.PAYMENT_GATEWAY === "mock" && provider.constructor.name !== "RazorpayProvider") {
      throw new Error("Provider should resolve to RazorpayProvider wrapper");
    }
    console.log("✓ Test 1 Passed.");

    // 2. Insert dummy order for checkout payment session testing
    console.log("\n[TEST 2] Inserting dummy order to DB...");
    await db.insert(orders).values({
      id: testOrderId,
      totalAmount: 149900, // INR 1499.00 in paise
      status: "pending"
    });
    console.log(`✓ Inserted order ${testOrderId}`);

    // 3. Create Payment Session
    console.log("\n[TEST 3] Creating payment session...");
    const session = await createPaymentSession(testOrderId);
    console.log("Generated Payment Session Details:", JSON.stringify(session, null, 2));

    if (session.orderId !== testOrderId) {
      throw new Error("Session orderId mismatch");
    }
    if (session.amount !== 149900) {
      throw new Error("Session amount mismatch");
    }
    if (!session.gatewayOrderId) {
      throw new Error("gatewayOrderId (Razorpay Order ID) should be generated");
    }

    // Verify it is recorded in the DB
    const dbPaymentRecord = await db.query.payments.findFirst({
      where: eq(payments.orderId, testOrderId)
    });

    if (!dbPaymentRecord) {
      throw new Error("Payment record not saved to database");
    }
    console.log("Saved payment DB record details:", JSON.stringify(dbPaymentRecord, null, 2));
    if (dbPaymentRecord.status !== "pending") {
      throw new Error(`Expected pending payment status, got: ${dbPaymentRecord.status}`);
    }
    createdPaymentRecordId = dbPaymentRecord.id;
    console.log("✓ Test 3 Passed.");

    // 4. Verify Payment State
    console.log("\n[TEST 4] Simulating checkout callback & verifying payment...");
    const mockPaymentId = `pay_mock_${nanoid(12)}`;
    const verification = await verifyAndRecordPayment({
      paymentId: mockPaymentId,
      orderId: testOrderId,
      gatewayOrderId: session.gatewayOrderId,
      signature: "mock_sig_success"
    });

    console.log("Verification Result from Gateway:", JSON.stringify(verification, null, 2));
    if (!verification.success) {
      throw new Error("Verification failed for mock payment callback");
    }

    // Verify status was updated to succeeded and gatewayTransactionId updated to mockPaymentId
    const updatedPayment = await db.query.payments.findFirst({
      where: eq(payments.id, createdPaymentRecordId)
    });

    if (!updatedPayment) {
      throw new Error("Updated payment record not found");
    }
    console.log("Updated payment DB record details:", JSON.stringify(updatedPayment, null, 2));
    if (updatedPayment.status !== "succeeded") {
      throw new Error(`Expected payment status 'succeeded', got: ${updatedPayment.status}`);
    }
    if (updatedPayment.gatewayTransactionId !== mockPaymentId) {
      throw new Error(`Expected gatewayTransactionId to be updated to payment ID: ${mockPaymentId}, got: ${updatedPayment.gatewayTransactionId}`);
    }
    console.log("✓ Test 4 Passed.");

    // 5. Test Refund Logic
    console.log("\n[TEST 5] Refunding order payment...");
    const refund = await refundOrderPayment(createdPaymentRecordId, 50000, "Customer requested partial cancellation"); // Refund 500.00 Rs
    console.log("Refund response details:", JSON.stringify(refund, null, 2));

    if (!refund.success) {
      throw new Error("Refund failed");
    }

    // Check if recorded in refunds table
    const dbRefundRecord = await db.query.refunds.findFirst({
      where: eq(refunds.paymentId, createdPaymentRecordId)
    });

    if (!dbRefundRecord) {
      throw new Error("Refund was not recorded in the DB refunds table");
    }
    console.log("Saved refund DB record details:", JSON.stringify(dbRefundRecord, null, 2));
    if (dbRefundRecord.amount !== 50000) {
      throw new Error(`Expected refund amount 50000, got: ${dbRefundRecord.amount}`);
    }
    if (dbRefundRecord.reason !== "Customer requested partial cancellation") {
      throw new Error("Reason mismatch in database refund record");
    }
    console.log("✓ Test 5 Passed.");

    console.log("\n=== ALL TESTS COMPLETED SUCCESSFULLY ===");

  } catch (error: any) {
    console.error("\n❌ TEST FAILURE:", error.message || error);
    process.exitCode = 1;
  } finally {
    // 6. DB Cleanup
    console.log("\n=== CLEANING UP TEST DATABASE RECORDS ===");
    try {
      if (createdPaymentRecordId) {
        // Cascade rules delete payments and refunds, but let's delete explicitly to be safe
        await db.delete(refunds).where(eq(refunds.paymentId, createdPaymentRecordId));
        await db.delete(payments).where(eq(payments.id, createdPaymentRecordId));
        console.log("✓ Cleared test payment and refund records.");
      }
      await db.delete(orders).where(eq(orders.id, testOrderId));
      console.log("✓ Cleared test order record.");
    } catch (cleanupError: any) {
      console.error("Warning: DB cleanup failed:", cleanupError.message || cleanupError);
    }
  }
}

runTests();
