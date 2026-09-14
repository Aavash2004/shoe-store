import { prisma } from "../lib/db/prisma";
import { calculateOrderPricing } from "../lib/checkout/pricing";
import { calculateShipping } from "../lib/checkout/shipping";
import {
  decrementStockWithLock,
  releaseOrderStock,
  InsufficientStockError,
} from "../lib/checkout/stock";
import { POST as checkoutRoute } from "../app/api/checkout/route";
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
  console.log("Starting Checkout & Idempotency Test Suite");
  console.log("==================================================\n");

  // ----------------------------------------------------
  // Test 1: Shipping Calculations across jurisdictions
  // ----------------------------------------------------
  console.log("--- 1. Shipping Rule Engine ---");
  const npBelow = calculateShipping(2000, "NP");
  assert(npBelow.shippingCost === 150 && !npBelow.isFree, "Nepal subtotal < Rs. 3000 incurs Rs. 150 flat shipping");
  assert(npBelow.amountNeededForFree === 1000, "Nepal shipping calculates accurate amount needed for free");

  const npAbove = calculateShipping(3000, "NP");
  assert(npAbove.shippingCost === 0 && npAbove.isFree, "Nepal subtotal >= Rs. 3000 gets free shipping");

  const usBelow = calculateShipping(100, "US");
  assert(usBelow.shippingCost === 15 && !usBelow.isFree, "US subtotal < $150 incurs $15 shipping");

  const usAbove = calculateShipping(150, "US");
  assert(usAbove.shippingCost === 0 && usAbove.isFree, "US subtotal >= $150 gets free shipping");

  const gbBelow = calculateShipping(100, "GB");
  assert(gbBelow.shippingCost === 12 && !gbBelow.isFree, "UK subtotal < £120 incurs £12 shipping");

  // ----------------------------------------------------
  // Test 2: Server-side Pricing Engine & Rounding
  // ----------------------------------------------------
  console.log("\n--- 2. Pricing Engine & Currency Rounding ---");
  // Find an active variant for pricing tests
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

  const npPricing = await calculateOrderPricing(
    [{ variantId: variant.id, quantity: 1 }],
    "NP"
  );
  assert(npPricing.currency === "NPR", "Nepal pricing currency is NPR");
  assert(Number.isInteger(npPricing.subtotal), "Nepal subtotal is rounded to whole Rupee integer");
  assert(Number.isInteger(npPricing.total), "Nepal total is rounded to whole Rupee integer");
  assert(npPricing.tax > 0, "Nepal pricing includes 13% VAT");

  const usPricing = await calculateOrderPricing(
    [{ variantId: variant.id, quantity: 1 }],
    "US"
  );
  assert(usPricing.currency === "USD", "US pricing currency is USD");
  assert(usPricing.tax === 0, "US tax is 0.00 (DDU model)");

  // ----------------------------------------------------
  // Test 3: Deadlock-Safe Stock Locking & Error Handling
  // ----------------------------------------------------
  console.log("\n--- 3. Stock Locking & Insufficient Stock Handling ---");
  try {
    await prisma.$transaction(async (tx) => {
      // Request way more than available stock
      await decrementStockWithLock(tx, [
        { variantId: variant.id, quantity: variant.stock + 9999 },
      ]);
    });
    assert(false, "Should have thrown InsufficientStockError");
  } catch (err: any) {
    assert(
      err instanceof InsufficientStockError || err.code === "OUT_OF_STOCK",
      "Throws InsufficientStockError on stock shortage with code OUT_OF_STOCK"
    );
  }

  // ----------------------------------------------------
  // Test 4: Missing Idempotency Key Validation in Route
  // ----------------------------------------------------
  console.log("\n--- 4. Missing Idempotency Key Enforcement ---");
  const missingKeyReq = new NextRequest("http://localhost:3000/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Test Customer",
      phone: "9841234567",
      line1: "Durbar Marg 12",
      city: "Kathmandu",
      state: "Bagmati",
      postalCode: "44600",
      country: "NP",
      paymentMethod: "COD",
      guestEmail: "test@example.com",
      items: [{ variantId: variant.id, quantity: 1 }],
    }),
  });

  const missingKeyRes = await checkoutRoute(missingKeyReq);
  assert(missingKeyRes.status === 400, "Missing idempotency key returns 400 Bad Request");
  const missingKeyData = await missingKeyRes.json();
  assert(missingKeyData.code === "MISSING_IDEMPOTENCY_KEY", "Returns MISSING_IDEMPOTENCY_KEY code");

  // ----------------------------------------------------
  // Test 5: End-to-End Single-Flight DB Idempotency
  // ----------------------------------------------------
  console.log("\n--- 5. Database-Level Unique Constraint Deduplication ---");
  const testIdempotencyKey = `test_idem_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const createReqPayload = {
    idempotencyKey: testIdempotencyKey,
    fullName: "Idempotency Test User",
    phone: "9841234567",
    line1: "New Road 10",
    city: "Kathmandu",
    state: "Bagmati",
    postalCode: "44600",
    country: "NP",
    paymentMethod: "COD",
    guestEmail: "idempotency_test@example.com",
    guestName: "Idempotency Test User",
    items: [{ variantId: variant.id, quantity: 1 }],
  };

  const firstReq = new NextRequest("http://localhost:3000/api/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": testIdempotencyKey,
    },
    body: JSON.stringify(createReqPayload),
  });

  const firstRes = await checkoutRoute(firstReq);
  assert(firstRes.status === 201, "First checkout request succeeds with 201 Created");
  const firstData = await firstRes.json();
  const createdOrderId = firstData.order?.id;
  assert(Boolean(createdOrderId), "First request returns valid order id");
  assert(firstData.order.transactionId === testIdempotencyKey, "Order transactionId matches idempotencyKey");

  // Fire duplicate request with identical idempotencyKey
  const duplicateReq = new NextRequest("http://localhost:3000/api/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": testIdempotencyKey,
    },
    body: JSON.stringify(createReqPayload),
  });

  const duplicateRes = await checkoutRoute(duplicateReq);
  assert(duplicateRes.status === 200, "Duplicate checkout request returns 200 OK (deduplicated)");
  const duplicateData = await duplicateRes.json();
  assert(duplicateData.deduplicated === true, "Response payload indicates deduplicated: true");
  assert(duplicateData.order?.id === createdOrderId, "Returned order ID matches the original winner order");

  // ----------------------------------------------------
  // Test 6: Idempotent Stock Release
  // ----------------------------------------------------
  console.log("\n--- 6. Idempotent Stock Release & Order Cancellation ---");
  const initialStock = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock ?? 0;

  // Release stock first time
  const release1 = await prisma.$transaction(async (tx) => {
    return await releaseOrderStock(tx, createdOrderId, "Testing releaseOrderStock");
  });
  assert(release1.success === true, "First stock release returns success: true");

  const postReleaseStock = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock ?? 0;
  assert(postReleaseStock === initialStock + 1, "Stock incremented by exactly 1 on first cancellation");

  // Release stock second time (idempotency check)
  const release2 = await prisma.$transaction(async (tx) => {
    return await releaseOrderStock(tx, createdOrderId, "Duplicate cancellation call");
  });
  assert(release2.success === false, "Second stock release returns success: false (already cancelled)");

  const postSecondReleaseStock = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock ?? 0;
  assert(postSecondReleaseStock === postReleaseStock, "Stock was not double-incremented on repeat cancellation");

  // ----------------------------------------------------
  // Cleanup Test Data
  // ----------------------------------------------------
  console.log("\n--- Cleaning up test artifacts ---");
  await prisma.orderStatusHistory.deleteMany({ where: { orderId: createdOrderId } });
  await prisma.orderItem.deleteMany({ where: { orderId: createdOrderId } });
  const deletedOrder = await prisma.order.delete({ where: { id: createdOrderId } });
  if (deletedOrder.addressId) {
    await prisma.address.delete({ where: { id: deletedOrder.addressId } }).catch(() => {});
  }
  // Restore variant stock to clean state
  await prisma.productVariant.update({
    where: { id: variant.id },
    data: { stock: initialStock },
  });
  console.log("Cleanup completed.");

  console.log("\n==================================================");
  console.log(`Test Suite Complete: ${passedTests}/${totalTests} tests passed.`);
  console.log("==================================================");
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test Suite crashed:", err);
    process.exit(1);
  });
