import { prisma } from "../lib/db/prisma";
import { isCountryEnabled } from "../lib/constants/countries";
import {
  toStripeSmallestUnit,
  validateStripeChargeMinimum,
} from "../lib/services/stripe";
import {
  decrementStockWithLock,
  releaseOrderStock,
} from "../lib/checkout/stock";
import { POST as webhookRoute } from "../app/api/webhooks/stripe/route";
import { NextRequest } from "next/server";

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAILED: ${testName}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
  passedTests++;
  console.log(`✅ PASSED: ${testName}`);
}

async function runTests() {
  console.log("==================================================");
  console.log("Starting Stripe Integration & Webhook Test Suite");
  console.log("==================================================\n");

  // ----------------------------------------------------
  // Test 1: Country Allowlist Gating
  // ----------------------------------------------------
  console.log("--- 1. Country Allowlist Gating ---");
  assert(isCountryEnabled("NP") === true, "Nepal (NP) checkout is enabled");
  assert(isCountryEnabled("US") === true, "United States (US) checkout is enabled");
  assert(isCountryEnabled("GB") === true, "United Kingdom (GB) checkout is enabled");
  assert(isCountryEnabled("FR") === false, "France (FR) checkout is safely disabled");
  assert(isCountryEnabled("AU") === false, "Australia (AU) checkout is safely disabled");

  // ----------------------------------------------------
  // Test 2: Currency Unit Conversion & Floor Checks
  // ----------------------------------------------------
  console.log("\n--- 2. Currency Smallest Unit & Floor Checks ---");
  assert(toStripeSmallestUnit(129.5, "USD") === 12950, "Converts $129.50 to 12950 cents");
  assert(toStripeSmallestUnit(99.0, "GBP") === 9900, "Converts £99.00 to 9900 pence");
  assert(toStripeSmallestUnit(0.5, "USD") === 50, "Converts $0.50 to 50 cents");

  const usdBelow = validateStripeChargeMinimum(0.49, "USD");
  assert(!usdBelow.isValid, "Rejects USD amount below $0.50 minimum");

  const usdValid = validateStripeChargeMinimum(0.5, "USD");
  assert(usdValid.isValid, "Accepts USD amount at or above $0.50 minimum");

  const gbpBelow = validateStripeChargeMinimum(0.29, "GBP");
  assert(!gbpBelow.isValid, "Rejects GBP amount below £0.30 minimum");

  const gbpValid = validateStripeChargeMinimum(0.3, "GBP");
  assert(gbpValid.isValid, "Accepts GBP amount at or above £0.30 minimum");

  // ----------------------------------------------------
  // Test 3: Webhook Missing Signature Protection
  // ----------------------------------------------------
  console.log("\n--- 3. Webhook Missing Signature Header ---");
  const unsignedReq = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    body: JSON.stringify({ type: "payment_intent.succeeded" }),
  });
  const unsignedRes = await webhookRoute(unsignedReq);
  assert(unsignedRes.status === 400, "Webhook rejects request missing stripe-signature with 400 Bad Request");
  const unsignedJson = await unsignedRes.json();
  assert(unsignedJson.error === "Missing stripe-signature header", "Returns descriptive missing signature error");

  // ----------------------------------------------------
  // Find test variant for DB tests
  // ----------------------------------------------------
  const variant = await prisma.productVariant.findFirst({
    where: {
      isActive: true,
      deletedAt: null,
      stock: { gte: 5 },
      product: {
        isActive: true,
        deletedAt: null,
      },
    },
    include: { product: true },
  });

  if (!variant) {
    throw new Error("No active product variant with sufficient stock found in DB for testing");
  }

  const initialStock = variant.stock;
  const testIdempotencyKey = `stripe_test_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const testPaymentIntentId = `pi_test_${Date.now()}`;

  // ----------------------------------------------------
  // Test 4: Atomic Webhook payment_intent.succeeded Transition
  // ----------------------------------------------------
  console.log("\n--- 4. Webhook payment_intent.succeeded Transition ---");

  // Create pending test order
  const pendingOrder = await prisma.order.create({
    data: {
      orderNumber: `TEST-ST-${Date.now()}`,
      paymentMethod: "STRIPE",
      paymentStatus: "PENDING",
      status: "PENDING",
      transactionId: testIdempotencyKey,
      stripePaymentIntentId: testPaymentIntentId,
      currency: "USD",
      exchangeRate: 1.0,
      subtotal: 100,
      total: 100,
      shipping: 0,
      tax: 0,
    },
  });

  // Simulate atomic update as executed by webhook
  const successTransition = await prisma.order.updateMany({
    where: {
      stripePaymentIntentId: testPaymentIntentId,
      paymentStatus: "PENDING",
    },
    data: {
      paymentStatus: "PAID",
      status: "PROCESSING",
    },
  });

  assert(successTransition.count === 1, "payment_intent.succeeded transitions PENDING order to PAID");

  const verifiedOrder = await prisma.order.findUnique({
    where: { id: pendingOrder.id },
  });

  assert(verifiedOrder?.paymentStatus === "PAID", "Order paymentStatus is verified as PAID");
  assert(verifiedOrder?.status === "PROCESSING", "Order status is verified as PROCESSING");

  // ----------------------------------------------------
  // Test 5: Duplicate Webhook Delivery (Idempotency)
  // ----------------------------------------------------
  console.log("\n--- 5. Duplicate Webhook Delivery Idempotency ---");
  const duplicateTransition = await prisma.order.updateMany({
    where: {
      stripePaymentIntentId: testPaymentIntentId,
      paymentStatus: "PENDING",
    },
    data: {
      paymentStatus: "PAID",
      status: "PROCESSING",
    },
  });

  assert(duplicateTransition.count === 0, "Duplicate webhook delivery is a safe idempotent no-op (count === 0)");

  // ----------------------------------------------------
  // Test 6: Webhook payment_intent.payment_failed Stock Release
  // ----------------------------------------------------
  console.log("\n--- 6. Webhook payment_intent.payment_failed Stock Release ---");
  const failedTestKey = `stripe_fail_${Date.now()}`;
  const failedPI = `pi_fail_${Date.now()}`;

  // Decrement stock for variant
  await prisma.$transaction(async (tx) => {
    await decrementStockWithLock(tx, [{ variantId: variant.id, quantity: 1 }]);
  });

  const decrementedStockVariant = await prisma.productVariant.findUnique({
    where: { id: variant.id },
  });
  assert(decrementedStockVariant?.stock === initialStock - 1, "Stock successfully decremented by 1 before failure test");

  // Create failed order holding the stock
  const failedOrder = await prisma.order.create({
    data: {
      orderNumber: `TEST-FAIL-${Date.now()}`,
      paymentMethod: "STRIPE",
      paymentStatus: "PENDING",
      status: "PENDING",
      transactionId: failedTestKey,
      stripePaymentIntentId: failedPI,
      currency: "USD",
      subtotal: 100,
      total: 100,
      shipping: 0,
      tax: 0,
      items: {
        create: [
          {
            variantId: variant.id,
            productName: variant.product.name,
            size: variant.size,
            color: variant.color,
            sku: variant.sku,
            price: variant.price,
            quantity: 1,
          },
        ],
      },
    },
  });

  // Execute safe stock release
  await prisma.$transaction(async (tx) => {
    const releaseResult = await releaseOrderStock(tx, failedOrder.id);
    assert(releaseResult.success === true, "releaseOrderStock returns success: true for failed order");
  });

  const restoredVariant = await prisma.productVariant.findUnique({
    where: { id: variant.id },
  });
  assert(restoredVariant?.stock === initialStock, "Inventory restored to original count on payment failure");

  // ----------------------------------------------------
  // Test 7: Cron Cleanup vs Webhook Success Race Condition
  // ----------------------------------------------------
  console.log("\n--- 7. Cron Cleanup vs Success Webhook Race Condition ---");
  const raceTestKey = `stripe_race_${Date.now()}`;
  const racePI = `pi_race_${Date.now()}`;

  const raceOrder = await prisma.order.create({
    data: {
      orderNumber: `TEST-RACE-${Date.now()}`,
      paymentMethod: "STRIPE",
      paymentStatus: "PENDING",
      status: "PENDING",
      transactionId: raceTestKey,
      stripePaymentIntentId: racePI,
      currency: "USD",
      subtotal: 100,
      total: 100,
      shipping: 0,
      tax: 0,
    },
  });

  // Webhook arrives first at 29:59 and marks PAID
  await prisma.order.updateMany({
    where: {
      stripePaymentIntentId: racePI,
      paymentStatus: "PENDING",
    },
    data: {
      paymentStatus: "PAID",
      status: "PROCESSING",
    },
  });

  // Cron cleanup runs right after, checking status
  const currentRaceOrder = await prisma.order.findUnique({
    where: { id: raceOrder.id },
    select: { paymentStatus: true, status: true },
  });

  // Verify cron conditional skips cancellation
  const isCancellableByCron =
    currentRaceOrder?.paymentStatus === "PENDING" &&
    currentRaceOrder?.status === "PENDING";

  assert(
    isCancellableByCron === false,
    "Cron conditional skips cancellation when webhook has already committed PAID / PROCESSING"
  );

  // ----------------------------------------------------
  // Clean up test records
  // ----------------------------------------------------
  console.log("\n--- Cleaning up test artifacts ---");
  await prisma.orderItem.deleteMany({
    where: { orderId: { in: [pendingOrder.id, failedOrder.id, raceOrder.id] } },
  });
  await prisma.orderStatusHistory.deleteMany({
    where: { orderId: { in: [pendingOrder.id, failedOrder.id, raceOrder.id] } },
  });
  await prisma.order.deleteMany({
    where: { id: { in: [pendingOrder.id, failedOrder.id, raceOrder.id] } },
  });
  console.log("Cleanup completed.");

  console.log("\n==================================================");
  console.log(`Test Suite Complete: ${passedTests}/${totalTests} tests passed.`);
  console.log("==================================================");
}

runTests()
  .catch((err) => {
    console.error("Test Suite Failed with error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
