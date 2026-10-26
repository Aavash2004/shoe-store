import "./setup-test-db";
import { NextRequest } from "next/server";
import { prisma } from "../lib/db/prisma";
import { reserveCouponUsage, releaseCouponUsage } from "../lib/checkout/coupon";
import { calculateOrderPricing } from "../lib/checkout/pricing";
import { releaseOrderStock, decrementStockWithLock } from "../lib/checkout/stock";
import { stripe, toStripeSmallestUnit } from "../lib/services/stripe";
import { toKhaltiPaisa } from "../lib/services/khalti";

import { COUNTRIES } from "../lib/constants/countries";
import { SHIPPING_RULES } from "../lib/checkout/shipping";
import { calculateDiscountAndTotal } from "../lib/checkout/discount";

// Real route handlers & actions
import { POST as stripeCreateIntentHandler } from "../app/api/checkout/stripe/create-intent/route";
import { POST as khaltiInitiateHandler } from "../app/api/checkout/khalti/initiate/route";
import { GET as khaltiCallbackHandler } from "../app/api/checkout/khalti/callback/route";
import { POST as codCheckoutHandler } from "../app/api/checkout/route";
import { POST as stripeWebhookHandler } from "../app/api/webhooks/stripe/route";
import { GET as cleanupCronHandler } from "../app/api/cron/cleanup-expired-orders/route";
import { updateOrderStatus } from "../app/admin/orders/[id]/actions";
import { GET as orderStatusHandler } from "../app/api/orders/[id]/status/route";

async function runTests() {
  console.log("=== Running Extended Route-Handler Parity & Payment Lifecycle Test Suite ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // Verify connected database is neondb_test to enforce absolute isolation
  const dbInfo = await prisma.$queryRaw<Array<{ current_database: string }>>`SELECT current_database()::text;`;
  const connectedDb = dbInfo[0]?.current_database;
  console.log(`[Test Environment] Connected to database: ${connectedDb}`);
  if (connectedDb !== "neondb_test") {
    throw new Error(`CRITICAL ISOLATION ERROR: Test suite is connected to '${connectedDb}' instead of 'neondb_test'. Aborting!`);
  }
  assert(connectedDb === "neondb_test", "Test suite is running against isolated neondb_test database");

  // 1. Locate an active product variant with ample stock
  const variant = await prisma.productVariant.findFirst({
    where: {
      isActive: true,
      deletedAt: null,
      stock: { gte: 5 },
      product: {
        isActive: true,
        deletedAt: null,
        category: {
          isActive: true,
        },
      },
    },
    include: { product: true },
  });

  if (!variant) {
    throw new Error("No active product variant with sufficient stock found for testing.");
  }

  // Ensure ample stock in test database for all sequential checkout and concurrency tests
  await prisma.productVariant.update({
    where: { id: variant.id },
    data: { stock: 100 },
  });

  const createdOrderIds: string[] = [];
  const createdCouponCodes: string[] = [];

  // =========================================================================
  // TEST 0: Shared Pure Discount & Total Calculation (Item 8)
  // =========================================================================
  console.log("--- TEST 0: Pure Discount & Total Calculation with NPR Rounding ---");
  const nprCalc1 = calculateDiscountAndTotal({
    subtotal: 3999,
    discountType: "PERCENTAGE",
    discountValue: 15,
    currency: "NPR",
    shipping: 0,
  });
  assert(nprCalc1.discount === 600, "NPR 15% on 3999 rounds discount to 600 NPR");
  assert(nprCalc1.total === 3399, "NPR total rounds to 3399 NPR");

  const nprCalc2 = calculateDiscountAndTotal({
    subtotal: 1234,
    discountType: "PERCENTAGE",
    discountValue: 7.5,
    currency: "NPR",
    shipping: 0,
  });
  assert(nprCalc2.discount === 93, "NPR 7.5% on 1234 rounds discount to 93 NPR");
  assert(nprCalc2.total === 1141, "NPR total rounds to 1141 NPR");

  const usdCalc = calculateDiscountAndTotal({
    subtotal: 49.99,
    discountType: "PERCENTAGE",
    discountValue: 15,
    currency: "USD",
    shipping: 0,
  });
  assert(usdCalc.discount === 7.50, "USD 15% on 49.99 rounds discount to 7.50 USD");
  assert(usdCalc.total === 42.49, "USD total rounds to 42.49 USD");

  const cappedCalc = calculateDiscountAndTotal({
    subtotal: 500,
    discountType: "FIXED",
    discountValue: 800,
    currency: "NPR",
    shipping: 100,
  });
  assert(cappedCalc.discount === 500, "Discount capped at subtotal");
  assert(cappedCalc.total === 100, "Total equals shipping when discount equals subtotal");

  // =========================================================================
  // Stripe Mocking & Payload Capture
  // =========================================================================
  let capturedStripePayload: any = null;
  const originalStripeCreate = stripe.paymentIntents.create.bind(stripe.paymentIntents);
  stripe.paymentIntents.create = (async (params: any, options?: any) => {
    capturedStripePayload = params;
    return {
      id: `pi_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      client_secret: `pi_mock_${Date.now()}_secret`,
      amount: params.amount,
      currency: params.currency,
      status: "requires_payment_method",
      metadata: params.metadata || {},
    } as any;
  }) as any;

  // =========================================================================
  // Khalti Fetch Mocking & Payload Capture
  // =========================================================================
  let capturedKhaltiInitiatePayload: any = null;
  let mockKhaltiLookupStatus: "Completed" | "Expired" | "User canceled" = "Completed";
  let mockKhaltiLookupAmountOverride: number | null = null;
  let khaltiInitiateShouldFail = false;

  const originalFetch = global.fetch;
  global.fetch = (async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input?.url || "";

    if (url.includes("/epayment/initiate/")) {
      if (khaltiInitiateShouldFail) {
        return new Response(
          JSON.stringify({ detail: "Simulated gateway connection error" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      const body = JSON.parse(init?.body || "{}");
      capturedKhaltiInitiatePayload = body;
      const mockPidx = `pidx_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return new Response(
        JSON.stringify({
          pidx: mockPidx,
          payment_url: `https://test-pay.khalti.com/?pidx=${mockPidx}`,
          expires_at: new Date(Date.now() + 1800000).toISOString(),
          expires_in: 1800,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.includes("/epayment/lookup/")) {
      const body = JSON.parse(init?.body || "{}");
      const pidx = body.pidx;
      const totalAmount = mockKhaltiLookupAmountOverride !== null
        ? mockKhaltiLookupAmountOverride
        : (capturedKhaltiInitiatePayload?.amount || 100000);

      return new Response(
        JSON.stringify({
          pidx,
          total_amount: totalAmount,
          status: mockKhaltiLookupStatus,
          transaction_id: `txn_mock_${Date.now()}`,
          fee: 0,
          refunded: false,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.includes("/epayment/refund/")) {
      return new Response(
        JSON.stringify({ success: true, detail: "Mock refund processed" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return originalFetch(input, init);
  }) as any;

  try {
    // =========================================================================
    // TEST 1: Concurrency Guard (maxUses = 1, 10 parallel reservations)
    // =========================================================================
    console.log("--- TEST 1: Concurrency Guard (maxUses = 1, 10 parallel reservations) ---");
    const testCodeConcurrency = `CONCUR_${Date.now()}`;
    createdCouponCodes.push(testCodeConcurrency);

    await prisma.coupon.create({
      data: {
        code: testCodeConcurrency,
        discountType: "FIXED_AMOUNT",
        discountValue: 20,
        minSubtotal: 0,
        maxUses: 1,
        usedCount: 0,
        isActive: true,
      },
    });

    const parallelReservations = await Promise.all(
      Array.from({ length: 10 }, () => reserveCouponUsage(prisma, testCodeConcurrency))
    );

    const successCount = parallelReservations.filter((r) => r === true).length;
    const failCount = parallelReservations.filter((r) => r === false).length;
    assert(successCount === 1, "Exactly 1 reservation succeeded out of 10 concurrent requests");
    assert(failCount === 9, "Exactly 9 reservations failed out of 10 concurrent requests");

    const couponStateAfterParallel = await prisma.coupon.findUnique({
      where: { code: testCodeConcurrency },
    });
    assert(couponStateAfterParallel?.usedCount === 1, "Database usedCount is strictly 1");

    // =========================================================================
    // TEST 2: Real Route Handler - Stripe Intent with GBP & Fixed Coupon
    // =========================================================================
    console.log("\n--- TEST 2: Real Route Handler - Stripe Intent (GBP, Fixed Coupon) ---");
    const testCodeGbpFixed = `GBP_FIX_${Date.now()}`;
    createdCouponCodes.push(testCodeGbpFixed);

    await prisma.coupon.create({
      data: {
        code: testCodeGbpFixed,
        discountType: "FIXED_AMOUNT",
        discountValue: 25,
        minSubtotal: 50,
        maxUses: 10,
        usedCount: 0,
        isActive: true,
      },
    });

    const gbpReq = new NextRequest("http://localhost:3000/api/checkout/stripe/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "James Bond",
        guestEmail: "007@mi6.gov.uk",
        phone: "07123456789",
        line1: "85 Albert Embankment",
        city: "London",
        state: "Greater London",
        postalCode: "SE1 7TP",
        country: "GB",
        paymentMethod: "STRIPE",
        idempotencyKey: `idem_gbp_${Date.now()}`,
        couponCode: testCodeGbpFixed,
        items: [{ variantId: variant.id, quantity: 2 }],
      }),
    });

    const gbpRes = await stripeCreateIntentHandler(gbpReq);
    assert(gbpRes.status === 201, "Stripe create-intent route returned HTTP 201 Created for GBP order");

    const gbpData = await gbpRes.json();
    createdOrderIds.push(gbpData.orderId);

    const gbpOrderInDb = await prisma.order.findUnique({
      where: { id: gbpData.orderId },
    });

    assert(Boolean(gbpOrderInDb), "Order record created in database");
    assert(gbpOrderInDb?.currency === "GBP", "Order currency is GBP");
    assert(capturedStripePayload !== null, "Stripe API create method was invoked");
    assert(capturedStripePayload.currency === "gbp", "Payload currency sent to Stripe is 'gbp'");
    assert(
      capturedStripePayload.amount === Math.round(Number(gbpOrderInDb?.total) * 100),
      `Stripe payload amount (${capturedStripePayload.amount}p) matches stored order total in pence (${Math.round(Number(gbpOrderInDb?.total) * 100)}p)`
    );

    // =========================================================================
    // TEST 3: Real Route Handler - Stripe Intent with USD, Percentage Coupon, Tax & Shipping
    // =========================================================================
    console.log("\n--- TEST 3: Real Route Handler - Stripe Intent (USD, 15% Percentage Coupon, Shipping & Tax) ---");
    const testCodeUsdPct = `USD_PCT_${Date.now()}`;
    createdCouponCodes.push(testCodeUsdPct);

    await prisma.coupon.create({
      data: {
        code: testCodeUsdPct,
        discountType: "PERCENTAGE",
        discountValue: 15, // 15% off
        minSubtotal: 0,
        maxUses: 10,
        usedCount: 0,
        isActive: true,
      },
    });

    // 1 item (subtotal < $150 threshold, so standard flat rate shipping of $15 applies)
    const usdReq = new NextRequest("http://localhost:3000/api/checkout/stripe/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Sarah Connor",
        guestEmail: "sarah@cyberdyne.com",
        phone: "3105550199",
        line1: "100 Resistance Way",
        city: "Los Angeles",
        state: "California",
        postalCode: "90001",
        country: "US",
        paymentMethod: "STRIPE",
        idempotencyKey: `idem_usd_${Date.now()}`,
        couponCode: testCodeUsdPct,
        items: [{ variantId: variant.id, quantity: 1 }],
      }),
    });

    capturedStripePayload = null;
    const usdRes = await stripeCreateIntentHandler(usdReq);
    assert(usdRes.status === 201, "Stripe create-intent route returned HTTP 201 for USD order with percentage coupon");

    const usdData = await usdRes.json();
    createdOrderIds.push(usdData.orderId);

    const usdOrderInDb = await prisma.order.findUnique({
      where: { id: usdData.orderId },
    });

    const expectedDiscount = Math.round(Number(variant.price) * 0.15 * 100) / 100;
    assert(Number(usdOrderInDb?.discount) === expectedDiscount, `15% Discount calculated correctly ($${expectedDiscount})`);
    const expectedShipping = Number(variant.price) >= 150 ? 0 : 15;
    assert(Number(usdOrderInDb?.shipping) === expectedShipping, `Shipping ($${expectedShipping}) applied based on $150 threshold`);
    assert(capturedStripePayload.currency === "usd", "Payload currency sent to Stripe is 'usd'");
    assert(
      capturedStripePayload.amount === Math.round(Number(usdOrderInDb?.total) * 100),
      `Stripe payload amount (${capturedStripePayload.amount} cents) matches stored total (${Math.round(Number(usdOrderInDb?.total) * 100)} cents)`
    );

    // =========================================================================
    // TEST 4: Real Route Handler - Stripe Intent with EUR & Percentage Coupon
    // =========================================================================
    console.log("\n--- TEST 4: Real Route Handler - Stripe Intent (EUR Currency, 20% Percentage Coupon) ---");
    // Dynamically inject test configuration for DE / EUR
    COUNTRIES.DE = {
      code: "DE",
      name: "Germany",
      flag: "🇩🇪",
      dialCode: "+49",
      currency: "EUR",
      postalCodeRegex: /^\d{5}$/,
      postalCodePlaceholder: "e.g. 10115",
      allowedPaymentMethods: ["STRIPE"],
      isCheckoutEnabled: true,
    };
    SHIPPING_RULES.DE = {
      freeThreshold: 140,
      flatRate: 14,
      carrierName: "DHL Express Europe",
      estimatedDeliveryTime: "3-5 business days",
      minEstimatedDays: 3,
      maxEstimatedDays: 5,
    };

    const testCodeEurPct = `EUR_PCT_${Date.now()}`;
    createdCouponCodes.push(testCodeEurPct);

    await prisma.coupon.create({
      data: {
        code: testCodeEurPct,
        discountType: "PERCENTAGE",
        discountValue: 20, // 20% off
        minSubtotal: 0,
        maxUses: 10,
        usedCount: 0,
        isActive: true,
      },
    });

    const eurReq = new NextRequest("http://localhost:3000/api/checkout/stripe/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Hans Gruber",
        guestEmail: "hans@nakatomi.de",
        phone: "03012345678",
        line1: "Friedrichstraße 43",
        city: "Berlin",
        state: "Berlin",
        postalCode: "10117",
        country: "DE",
        paymentMethod: "STRIPE",
        idempotencyKey: `idem_eur_${Date.now()}`,
        couponCode: testCodeEurPct,
        items: [{ variantId: variant.id, quantity: 2 }],
      }),
    });

    capturedStripePayload = null;
    const eurRes = await stripeCreateIntentHandler(eurReq);
    assert(eurRes.status === 201, "Stripe create-intent returned HTTP 201 for EUR Germany order");

    const eurData = await eurRes.json();
    createdOrderIds.push(eurData.orderId);

    const eurOrderInDb = await prisma.order.findUnique({
      where: { id: eurData.orderId },
    });

    assert(eurOrderInDb?.currency === "EUR", "Order currency stored as EUR");
    assert(capturedStripePayload.currency === "eur", "Stripe payload currency sent as 'eur'");
    assert(
      capturedStripePayload.amount === Math.round(Number(eurOrderInDb?.total) * 100),
      `EUR: Amount sent to Stripe (${capturedStripePayload.amount} cents) == Stored order total in cents (${Math.round(Number(eurOrderInDb?.total) * 100)})`
    );

    // =========================================================================
    // TEST 5: Real Route Handler - Khalti Initiate -> Callback Full Lifecycle
    // =========================================================================
    console.log("\n--- TEST 5: Real Route Handler - Khalti Initiate -> Callback End-to-End ---");
    const testCodeKhaltiE2E = `KH_E2E_${Date.now()}`;
    createdCouponCodes.push(testCodeKhaltiE2E);

    await prisma.coupon.create({
      data: {
        code: testCodeKhaltiE2E,
        discountType: "PERCENTAGE",
        discountValue: 10, // 10% discount
        minSubtotal: 0,
        maxUses: 1,
        usedCount: 0,
        isActive: true,
      },
    });

    const initialVariantStock = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock ?? 0;

    // 5a. Call Khalti Initiate route
    const khaltiInitiateReq = new NextRequest("http://localhost:3000/api/checkout/khalti/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Aarav Sharma",
        guestEmail: "aarav@gmail.com",
        phone: "9841234567",
        line1: "New Road 12",
        city: "Kathmandu",
        state: "Bagmati",
        postalCode: "44600",
        country: "NP",
        paymentMethod: "KHALTI",
        idempotencyKey: `idem_khalti_${Date.now()}`,
        couponCode: testCodeKhaltiE2E,
        items: [{ variantId: variant.id, quantity: 2 }],
      }),
    });

    capturedKhaltiInitiatePayload = null;
    const khaltiInitRes = await khaltiInitiateHandler(khaltiInitiateReq);
    assert(khaltiInitRes.status === 201, "Khalti initiate route returned HTTP 201 Created");

    const khaltiInitData = await khaltiInitRes.json();
    createdOrderIds.push(khaltiInitData.orderId);

    const khaltiOrderPending = await prisma.order.findUnique({
      where: { id: khaltiInitData.orderId },
    });

    assert(khaltiOrderPending?.status === "PENDING", "Khalti order created with status PENDING");
    assert(khaltiOrderPending?.paymentStatus === "PENDING", "Khalti order paymentStatus is PENDING");
    assert(Boolean(khaltiOrderPending?.khaltiPidx), "Khalti pidx associated with order in database");

    const expectedPaisa = Math.round(Number(khaltiOrderPending?.total) * 100);
    assert(
      capturedKhaltiInitiatePayload?.amount === expectedPaisa,
      `Khalti payload amount (${capturedKhaltiInitiatePayload?.amount} paisa) matches exact order total in paisa (${expectedPaisa} paisa)`
    );

    const couponDuringKhaltiPending = await prisma.coupon.findUnique({ where: { code: testCodeKhaltiE2E } });
    assert(couponDuringKhaltiPending?.usedCount === 1, "Single-use coupon usedCount incremented to 1 on initiation");

    // Stock was decremented by 2
    const stockDuringPending = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock ?? 0;
    assert(stockDuringPending === initialVariantStock - 2, "Inventory decremented during Khalti initiation");

    // 5b. Call Khalti Callback Route with Completed status
    mockKhaltiLookupStatus = "Completed";
    mockKhaltiLookupAmountOverride = expectedPaisa;

    const callbackReq = new NextRequest(
      `http://localhost:3000/api/checkout/khalti/callback?pidx=${khaltiInitData.pidx}&purchase_order_id=${khaltiInitData.orderId}`,
      { method: "GET" }
    );

    const callbackRes = await khaltiCallbackHandler(callbackReq);
    assert(callbackRes.status === 307 || callbackRes.status === 302, "Khalti callback redirected customer");
    const redirectLocation = callbackRes.headers.get("location") || "";
    assert(redirectLocation.includes(`/order-confirmation/${khaltiInitData.orderId}`), "Callback redirected to order confirmation page");

    const khaltiOrderPaid = await prisma.order.findUnique({
      where: { id: khaltiInitData.orderId },
    });

    assert(khaltiOrderPaid?.paymentStatus === "PAID", "Order paymentStatus transitioned to PAID");
    assert(khaltiOrderPaid?.status === "PROCESSING", "Order status transitioned to PROCESSING");
    assert(Boolean(khaltiOrderPaid?.transactionId), "Khalti transactionId stored on order record");

    // 5c. Idempotent second callback call
    const duplicateCallbackRes = await khaltiCallbackHandler(callbackReq);
    assert(
      duplicateCallbackRes.status === 307 || duplicateCallbackRes.status === 302,
      "Duplicate callback safely redirected without error (Idempotency check)"
    );

    // =========================================================================
    // TEST 6: Khalti Initiate Failure Rollback (Immediate Stock & Coupon Release)
    // =========================================================================
    console.log("\n--- TEST 6: Khalti Initiate Failure Rollback (Immediate Stock & Coupon Release) ---");
    const testCodeKhaltiFail = `KH_FAIL_${Date.now()}`;
    createdCouponCodes.push(testCodeKhaltiFail);

    await prisma.coupon.create({
      data: {
        code: testCodeKhaltiFail,
        discountType: "FIXED_AMOUNT",
        discountValue: 10,
        minSubtotal: 0,
        maxUses: 1,
        usedCount: 0,
        isActive: true,
      },
    });

    const stockBeforeFailureTest = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock ?? 0;

    // Force Khalti initiation to simulate gateway network error
    khaltiInitiateShouldFail = true;

    const khaltiFailReq = new NextRequest("http://localhost:3000/api/checkout/khalti/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Failure Test User",
        guestEmail: "fail@test.com",
        phone: "9841000000",
        line1: "Durbar Marg",
        city: "Kathmandu",
        state: "Bagmati",
        postalCode: "44600",
        country: "NP",
        paymentMethod: "KHALTI",
        idempotencyKey: `idem_fail_${Date.now()}`,
        couponCode: testCodeKhaltiFail,
        items: [{ variantId: variant.id, quantity: 3 }],
      }),
    });

    let caughtInitiateError = false;
    try {
      const failRes = await khaltiInitiateHandler(khaltiFailReq);
      if (failRes.status >= 400) {
        caughtInitiateError = true;
      }
    } catch {
      caughtInitiateError = true;
    }

    khaltiInitiateShouldFail = false;
    assert(caughtInitiateError, "Khalti initiate caught gateway network failure");

    // Verify stock was restored immediately
    const stockAfterFailureTest = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock ?? 0;
    assert(
      stockAfterFailureTest === stockBeforeFailureTest,
      "Stock was restored immediately upon gateway initiation failure"
    );

    // Verify coupon was released immediately
    const couponAfterFailureTest = await prisma.coupon.findUnique({ where: { code: testCodeKhaltiFail } });
    assert(
      couponAfterFailureTest?.usedCount === 0,
      "Coupon usedCount was rolled back immediately to 0 upon initiation failure"
    );

    // =========================================================================
    // TEST 7: Late Payment Arrival on CANCELLED Order (Reinstatement vs Auto-Refund)
    // =========================================================================
    console.log("\n--- TEST 7: Late Payment Arrival on CANCELLED Order ---");
    // 7a. Reinstatement when stock is available
    const lateOrderAvailable = await prisma.order.create({
      data: {
        orderNumber: `ORD-LATE-OK-${Date.now()}`,
        currency: "NPR",
        subtotal: 5000,
        shipping: 0,
        discount: 0,
        total: 5000,
        paymentMethod: "KHALTI",
        paymentStatus: "PENDING",
        status: "CANCELLED", // Already cancelled by timeout
        khaltiPidx: `pidx_late_avail_${Date.now()}`,
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku,
              price: 2500,
              quantity: 1,
            },
          ],
        },
      },
    });
    createdOrderIds.push(lateOrderAvailable.id);

    mockKhaltiLookupStatus = "Completed";
    mockKhaltiLookupAmountOverride = 500000;

    const lateCallbackReq = new NextRequest(
      `http://localhost:3000/api/checkout/khalti/callback?pidx=${lateOrderAvailable.khaltiPidx}&purchase_order_id=${lateOrderAvailable.id}`,
      { method: "GET" }
    );

    const lateCallbackRes = await khaltiCallbackHandler(lateCallbackReq);
    assert(
      Boolean(lateCallbackRes.headers.get("location")?.includes(`/order-confirmation/${lateOrderAvailable.id}`)),
      "Late payment on CANCELLED order reinstated to confirmation page when stock was available"
    );

    const lateOrderAfterCallback = await prisma.order.findUnique({ where: { id: lateOrderAvailable.id } });
    assert(lateOrderAfterCallback?.status === "PROCESSING", "Late order status reinstated to PROCESSING");
    assert(lateOrderAfterCallback?.paymentStatus === "PAID", "Late order paymentStatus set to PAID");

    // 7b. Auto-refund when stock is unavailable
    // Drain stock to 0 to simulate out-of-stock scenario
    const variantBeforeDrain = await prisma.productVariant.findUnique({ where: { id: variant.id } });
    const originalStock = variantBeforeDrain?.stock ?? 10;
    await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: 0 } });

    const lateOrderOutOfStock = await prisma.order.create({
      data: {
        orderNumber: `ORD-LATE-OOS-${Date.now()}`,
        currency: "NPR",
        subtotal: 5000,
        shipping: 0,
        discount: 0,
        total: 5000,
        paymentMethod: "KHALTI",
        paymentStatus: "PENDING",
        status: "CANCELLED",
        khaltiPidx: `pidx_late_oos_${Date.now()}`,
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku,
              price: 2500,
              quantity: 1,
            },
          ],
        },
      },
    });
    createdOrderIds.push(lateOrderOutOfStock.id);

    const oosCallbackReq = new NextRequest(
      `http://localhost:3000/api/checkout/khalti/callback?pidx=${lateOrderOutOfStock.khaltiPidx}&purchase_order_id=${lateOrderOutOfStock.id}`,
      { method: "GET" }
    );

    const oosCallbackRes = await khaltiCallbackHandler(oosCallbackReq);
    assert(
      Boolean(oosCallbackRes.headers.get("location")?.includes("/checkout?error=")),
      "Late payment on out-of-stock CANCELLED order redirected to checkout with refund notification"
    );

    const oosOrderAfterCallback = await prisma.order.findUnique({ where: { id: lateOrderOutOfStock.id } });
    assert(
      oosOrderAfterCallback?.status === "MANUAL_REVIEW" && oosOrderAfterCallback?.paymentStatus === "PAID",
      "Late payment on out-of-stock CANCELLED order placed in MANUAL_REVIEW with paymentStatus PAID (Item 4)"
    );

    // Restore variant stock back
    await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: originalStock } });

    // =========================================================================
    // TEST 8: Admin cancel from MANUAL_REVIEW releases stock & coupon (Item 5)
    // =========================================================================
    console.log("\n--- TEST 8: Admin cancel from MANUAL_REVIEW releases stock and coupon ---");
    const mrCouponCode = `TEST_COUPON_MR_${Date.now()}`;
    const mrCoupon = await prisma.coupon.create({
      data: {
        code: mrCouponCode,
        discountType: "FIXED_AMOUNT",
        discountValue: 10,
        minSubtotal: 0,
        maxUses: 5,
        usedCount: 1, // Currently counted as used
        isActive: true,
      },
    });
    createdCouponCodes.push(mrCoupon.code);

    const initialStock = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock ?? 10;

    const mrOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-MR-${Date.now()}`,
        currency: "USD",
        subtotal: 50,
        shipping: 0,
        discount: 10,
        total: 40,
        paymentMethod: "STRIPE",
        paymentStatus: "PAID",
        status: "MANUAL_REVIEW",
        couponCode: mrCoupon.code,
        couponId: mrCoupon.id,
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku,
              price: 50,
              quantity: 1,
            },
          ],
        },
      },
    });
    createdOrderIds.push(mrOrder.id);

    // Call releaseOrderStock simulating admin cancellation from MANUAL_REVIEW
    const mrReleaseResult = await releaseOrderStock(
      prisma,
      mrOrder.id,
      "Admin cancelled order from MANUAL_REVIEW"
    );

    assert(mrReleaseResult.success, "releaseOrderStock succeeds from MANUAL_REVIEW status");
    const mrOrderAfterCancel = await prisma.order.findUnique({ where: { id: mrOrder.id } });
    assert(mrOrderAfterCancel?.status === "CANCELLED", "Order status successfully transitioned to CANCELLED");

    const stockAfterMrCancel = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock;
    assert(stockAfterMrCancel === initialStock + 1, "Stock was restored by 1 upon admin cancel from MANUAL_REVIEW");

    const couponAfterMrCancel = await prisma.coupon.findUnique({ where: { id: mrCoupon.id } });
    assert(couponAfterMrCancel?.usedCount === 0, "Coupon usedCount was released (decremented from 1 to 0)");

    // Restore variant stock back with ample quantity for subsequent concurrency tests
    await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: Math.max(initialStock, 10) } });

    // =========================================================================
    // TEST 9: Concurrent late-payment duplicate webhook deliveries (Item 8)
    // =========================================================================
    console.log("\n--- TEST 9: Concurrent duplicate webhook deliveries on CANCELLED order ---");
    const stockBeforeLate = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock ?? 10;
    const lateStripePi = `pi_late_concurrent_${Date.now()}`;

    const lateCancelledOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-LATE-STRIPE-${Date.now()}`,
        currency: "USD",
        subtotal: 50,
        shipping: 0,
        discount: 0,
        total: 50,
        paymentMethod: "STRIPE",
        paymentStatus: "PENDING",
        status: "CANCELLED",
        stripePaymentIntentId: lateStripePi,
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku,
              price: 50,
              quantity: 1,
            },
          ],
        },
      },
    });
    createdOrderIds.push(lateCancelledOrder.id);

    // Mock constructEvent to return payment_intent.succeeded
    const originalConstructEvent = stripe.webhooks.constructEvent;
    stripe.webhooks.constructEvent = ((body: any) => JSON.parse(body)) as any;

    const webhookPayload = JSON.stringify({
      id: `evt_mock_${Date.now()}`,
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: lateStripePi,
          amount: 5000,
          currency: "usd",
          status: "succeeded",
          metadata: { orderId: lateCancelledOrder.id },
        },
      },
    });

    const createWebhookReq = () =>
      new NextRequest("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "mock_sig",
        },
        body: webhookPayload,
      });

    // Deliver 2 webhook calls concurrently
    const [res1, res2] = await Promise.all([
      stripeWebhookHandler(createWebhookReq()),
      stripeWebhookHandler(createWebhookReq()),
    ]);

    assert(res1.status === 200 && res2.status === 200, "Both duplicate webhook deliveries handled with 200 OK");

    const orderAfterConcurrentLate = await prisma.order.findUnique({ where: { id: lateCancelledOrder.id } });
    assert(orderAfterConcurrentLate?.status === "PROCESSING", "Late order claimed and reinstated to PROCESSING");
    assert(orderAfterConcurrentLate?.paymentStatus === "PAID", "Late order payment status set to PAID");

    const stockAfterConcurrentLate = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock ?? 0;
    assert(
      stockAfterConcurrentLate === stockBeforeLate - 1,
      `Stock decremented EXACTLY ONCE (${stockBeforeLate} -> ${stockAfterConcurrentLate}) despite duplicate deliveries`
    );

    // Restore stock and mocks
    await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: stockBeforeLate } });
    stripe.webhooks.constructEvent = originalConstructEvent;

    // =========================================================================
    // TEST 10: MANUAL_REVIEW Causes (a) vs (b) Stock and Coupon Release (Item 1)
    // =========================================================================
    console.log("\n--- TEST 10: MANUAL_REVIEW Causes (a) vs (b) Stock and Coupon Release ---");

    // Case (a): Amount mismatch — stock and coupon WERE reserved
    const couponA = await prisma.coupon.create({
      data: {
        code: `MR_A_${Date.now()}`,
        discountType: "FIXED_AMOUNT",
        discountValue: 10,
        minSubtotal: 0,
        usedCount: 1,
        isActive: true,
      },
    });
    createdCouponCodes.push(couponA.code);

    const stockBeforeCancelA = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock ?? 10;

    const orderA = await prisma.order.create({
      data: {
        orderNumber: `ORD-MR-A-${Date.now()}`,
        currency: "NPR",
        subtotal: 1000,
        shipping: 0,
        discount: 10,
        total: 990,
        paymentMethod: "KHALTI",
        paymentStatus: "PENDING",
        status: "MANUAL_REVIEW",
        coupon: { connect: { id: couponA.id } },
        couponCode: couponA.code,
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku,
              price: 1000,
              quantity: 1,
            },
          ],
        },
        statusHistory: {
          create: [
            {
              status: "MANUAL_REVIEW",
              note: "🚨 Payment amount mismatch: expected 99000 paisa, received 50000 paisa. Stock and promo code remain reserved.",
            },
          ],
        },
      },
    });
    createdOrderIds.push(orderA.id);

    const releaseResultA = await releaseOrderStock(prisma, orderA.id, "Admin cancel case (a)");
    assert(releaseResultA.success, "Case (a) order cancellation succeeded");

    const stockAfterCancelA = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock;
    assert(
      stockAfterCancelA === stockBeforeCancelA + 1,
      `Case (a): Stock was restored (${stockBeforeCancelA} -> ${stockAfterCancelA})`
    );

    const couponAfterCancelA = await prisma.coupon.findUnique({ where: { id: couponA.id } });
    assert(
      couponAfterCancelA?.usedCount === 0,
      `Case (a): Coupon usedCount was released (decremented 1 -> ${couponAfterCancelA?.usedCount})`
    );

    // Reset stock
    await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: stockBeforeCancelA } });

    // Case (b): Late payment out-of-stock / refund failure — stock was NOT held
    const couponB = await prisma.coupon.create({
      data: {
        code: `MR_B_${Date.now()}`,
        discountType: "FIXED_AMOUNT",
        discountValue: 10,
        minSubtotal: 0,
        usedCount: 1,
        isActive: true,
      },
    });
    createdCouponCodes.push(couponB.code);

    const stockBeforeCancelB = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock ?? 10;

    const orderB = await prisma.order.create({
      data: {
        orderNumber: `ORD-MR-B-${Date.now()}`,
        currency: "NPR",
        subtotal: 1000,
        shipping: 0,
        discount: 10,
        total: 990,
        paymentMethod: "KHALTI",
        paymentStatus: "PAID",
        status: "MANUAL_REVIEW",
        stockReserved: false,
        manualReviewReason: "LATE_PAYMENT_OUT_OF_STOCK",
        coupon: { connect: { id: couponB.id } },
        couponCode: couponB.code,
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku,
              price: 1000,
              quantity: 1,
            },
          ],
        },
        statusHistory: {
          create: [
            {
              status: "MANUAL_REVIEW",
              note: "Late payment received via Khalti for CANCELLED order, but stock was no longer available. Held in MANUAL_REVIEW for merchant review and manual refund.",
            },
          ],
        },
      },
    });
    createdOrderIds.push(orderB.id);

    const releaseResultB = await releaseOrderStock(prisma, orderB.id, "Admin cancel case (b)");
    assert(releaseResultB.success, "Case (b) order cancellation succeeded");

    const stockAfterCancelB = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock;
    assert(
      stockAfterCancelB === stockBeforeCancelB,
      `Case (b): Stock remained UNCHANGED (${stockBeforeCancelB} -> ${stockAfterCancelB})`
    );

    const couponAfterCancelB = await prisma.coupon.findUnique({ where: { id: couponB.id } });
    assert(
      couponAfterCancelB?.usedCount === 1,
      `Case (b): Coupon usedCount remained UNCHANGED (1 -> ${couponAfterCancelB?.usedCount})`
    );

    // =========================================================================
    // TEST 11: Restrict MANUAL_REVIEW -> PROCESSING for Case (b) unless stock re-reserved
    // =========================================================================
    console.log("\n--- TEST 11: Restrict MANUAL_REVIEW -> PROCESSING for Case (b) unless stock re-reserved ---");
    const couponB2 = await prisma.coupon.create({
      data: {
        code: `MR_B2_${Date.now()}`,
        discountType: "FIXED_AMOUNT",
        discountValue: 10,
        minSubtotal: 0,
        usedCount: 0,
        isActive: true,
      },
    });
    createdCouponCodes.push(couponB2.code);

    const orderB2 = await prisma.order.create({
      data: {
        orderNumber: `ORD-MR-B2-${Date.now()}`,
        currency: "NPR",
        subtotal: 1000,
        shipping: 0,
        discount: 10,
        total: 990,
        paymentMethod: "KHALTI",
        paymentStatus: "PAID",
        status: "MANUAL_REVIEW",
        stockReserved: false,
        manualReviewReason: "LATE_PAYMENT_OUT_OF_STOCK",
        coupon: { connect: { id: couponB2.id } },
        couponCode: couponB2.code,
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku,
              price: 1000,
              quantity: 1,
            },
          ],
        },
        statusHistory: {
          create: [
            {
              status: "MANUAL_REVIEW",
              note: "Late payment received via Khalti for CANCELLED order, but stock was no longer available. Held in MANUAL_REVIEW.",
            },
          ],
        },
      },
    });
    createdOrderIds.push(orderB2.id);

    // Deplete stock to 0
    await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: 0 } });

    const blockedResult = await updateOrderStatus(orderB2.id, "PROCESSING");
    assert(!blockedResult.success && blockedResult.error?.includes("Cannot confirm order"), "Admin cannot transition Case (b) MANUAL_REVIEW -> PROCESSING when out of stock");

    // Replenish stock to 5
    await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: 5 } });

    const allowedResult = await updateOrderStatus(orderB2.id, "PROCESSING");
    assert(allowedResult.success, "Admin transition Case (b) MANUAL_REVIEW -> PROCESSING succeeds when stock available");

    const stockAfterReReserve = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock;
    assert(stockAfterReReserve === 4, `Stock decremented from 5 to 4 upon confirming Case (b) order`);

    const couponAfterReReserve = await prisma.coupon.findUnique({ where: { id: couponB2.id } });
    assert(couponAfterReReserve?.usedCount === 1, `Coupon usedCount incremented from 0 to 1 upon re-activating Case (b) order`);

    const orderB2AfterReactivation = await prisma.order.findUnique({ where: { id: orderB2.id } });
    assert(orderB2AfterReactivation?.stockReserved === true, "stockReserved updated to true upon re-activation");
    assert(orderB2AfterReactivation?.manualReviewReason === null, "manualReviewReason cleared upon re-activation");

    // Reset stock back
    await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: stockBeforeCancelB } });

    // =========================================================================
    // TEST 12: Cleanup Cron - Paid-but-tab-closed Khalti Order (Item 2)
    // =========================================================================
    console.log("\n--- TEST 12: Cleanup Cron - Paid-but-tab-closed Khalti Order ---");
    const cronSecret = process.env.CRON_SECRET || "shoes_store_cron_secret_key_2026";
    const cronReq = () =>
      new NextRequest("http://localhost:3000/api/cron/cleanup-expired-orders", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${cronSecret}`,
        },
      });

    const khaltiTabClosedPidx = `pidx_tab_closed_${Date.now()}`;
    const khaltiTabClosedOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-TAB-CLOSED-${Date.now()}`,
        currency: "NPR",
        subtotal: 2500,
        shipping: 0,
        discount: 0,
        total: 2500,
        paymentMethod: "KHALTI",
        paymentStatus: "PENDING",
        status: "PENDING",
        khaltiPidx: khaltiTabClosedPidx,
        createdAt: new Date(Date.now() - 35 * 60 * 1000), // 35 mins ago
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku,
              price: 2500,
              quantity: 1,
            },
          ],
        },
      },
    });
    createdOrderIds.push(khaltiTabClosedOrder.id);

    // Mock fetch for Khalti lookup
    const savedFetch = global.fetch;
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = typeof input === "string" ? input : (input as Request).url || input.toString();
      if (urlStr.includes("/epayment/lookup/")) {
        return new Response(
          JSON.stringify({
            pidx: khaltiTabClosedPidx,
            total_amount: 250000,
            status: "Completed",
            transaction_id: `txn_tab_closed_${Date.now()}`,
            fee: 0,
            refunded: false,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return savedFetch(input, init);
    }) as any;

    const cronRes12 = await cleanupCronHandler(cronReq());
    const cronData12 = await cronRes12.json();

    const orderAfterCron12 = await prisma.order.findUnique({ where: { id: khaltiTabClosedOrder.id } });
    assert(orderAfterCron12?.status === "PROCESSING", "Paid-but-tab-closed Khalti order confirmed to PROCESSING by cleanup cron");
    assert(orderAfterCron12?.paymentStatus === "PAID", "Paid-but-tab-closed Khalti order marked as PAID by cleanup cron");
    assert(cronData12.results.confirmed >= 1, "Cron reported confirmed >= 1");
    global.fetch = savedFetch;

    // =========================================================================
    // TEST 13: Cleanup Cron - Stripe Retrieve Failure (Item 2)
    // =========================================================================
    console.log("\n--- TEST 13: Cleanup Cron - Stripe Retrieve Failure ---");
    const stripeFailPi = `pi_fail_${Date.now()}`;
    const stripeFailOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-STRIPE-FAIL-${Date.now()}`,
        currency: "USD",
        subtotal: 50,
        shipping: 0,
        discount: 0,
        total: 50,
        paymentMethod: "STRIPE",
        paymentStatus: "PENDING",
        status: "PENDING",
        stripePaymentIntentId: stripeFailPi,
        createdAt: new Date(Date.now() - 35 * 60 * 1000),
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku,
              price: 50,
              quantity: 1,
            },
          ],
        },
      },
    });
    createdOrderIds.push(stripeFailOrder.id);

    const savedStripeRetrieve = stripe.paymentIntents.retrieve;
    stripe.paymentIntents.retrieve = (async () => {
      throw new Error("Stripe network error: Connection timeout");
    }) as any;

    const cronRes13 = await cleanupCronHandler(cronReq());
    const cronData13 = await cronRes13.json();

    const orderAfterCron13 = await prisma.order.findUnique({ where: { id: stripeFailOrder.id } });
    assert(orderAfterCron13?.status === "PENDING", "Order remains PENDING (skipped) when Stripe retrieve fails");
    assert(cronData13.results.errors.some((e: string) => e.includes("Connection timeout")), "Cron logged the Stripe retrieve error for retry");
    stripe.paymentIntents.retrieve = savedStripeRetrieve;

    // =========================================================================
    // TEST 14: Cleanup Cron - Racing a Payment (Item 2)
    // =========================================================================
    console.log("\n--- TEST 14: Cleanup Cron - Racing a Payment ---");
    const stripeRacingPi = `pi_racing_${Date.now()}`;
    const stripeRacingOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-STRIPE-RACING-${Date.now()}`,
        currency: "USD",
        subtotal: 50,
        shipping: 0,
        discount: 0,
        total: 50,
        paymentMethod: "STRIPE",
        paymentStatus: "PENDING",
        status: "PENDING",
        stripePaymentIntentId: stripeRacingPi,
        createdAt: new Date(Date.now() - 35 * 60 * 1000),
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku,
              price: 50,
              quantity: 1,
            },
          ],
        },
      },
    });
    createdOrderIds.push(stripeRacingOrder.id);

    stripe.paymentIntents.retrieve = (async () => ({
      id: stripeRacingPi,
      status: "processing",
    })) as any;

    const cronRes14 = await cleanupCronHandler(cronReq());
    const cronData14 = await cronRes14.json();

    const orderAfterCron14 = await prisma.order.findUnique({ where: { id: stripeRacingOrder.id } });
    assert(orderAfterCron14?.status === "PENDING", "Order with in-flight payment ('processing') is skipped and NOT cancelled");
    assert(orderAfterCron14?.paymentStatus === "PENDING", "Order paymentStatus remains PENDING");
    stripe.paymentIntents.retrieve = savedStripeRetrieve;

    // =========================================================================
    // TEST 15: Late Stripe payment, out of stock, refund fails -> MANUAL_REVIEW -> admin cancel (Item 1)
    // =========================================================================
    console.log("\n--- TEST 15: Late Stripe payment, out of stock, refund fails -> MANUAL_REVIEW -> admin cancel ---");
    const e2eCoupon = await prisma.coupon.create({
      data: {
        code: `E2E_REFUND_FAIL_${Date.now()}`,
        discountType: "FIXED_AMOUNT",
        discountValue: 10,
        minSubtotal: 0,
        usedCount: 0,
        isActive: true,
      },
    });
    createdCouponCodes.push(e2eCoupon.code);

    const e2eStripePi = `pi_e2e_late_${Date.now()}`;
    const e2eOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-E2E-LATE-${Date.now()}`,
        currency: "USD",
        subtotal: 50,
        shipping: 0,
        discount: 10,
        total: 40,
        paymentMethod: "STRIPE",
        paymentStatus: "PENDING",
        status: "CANCELLED",
        stockReserved: false,
        stripePaymentIntentId: e2eStripePi,
        couponId: e2eCoupon.id,
        couponCode: e2eCoupon.code,
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku,
              price: 50,
              quantity: 2,
            },
          ],
        },
      },
    });
    createdOrderIds.push(e2eOrder.id);

    // Deplete stock to 0 so reinstatement fails with InsufficientStockError
    const stockBaseline15 = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock ?? 10;
    await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: 0 } });

    // Mock stripe.refunds.create to simulate refund failure
    const originalStripeRefundCreate15 = stripe.refunds.create;
    stripe.refunds.create = (async () => {
      throw new Error("Stripe API Error: Balance insufficient for refund");
    }) as any;

    // Mock constructEvent
    const originalConstructEvent15 = stripe.webhooks.constructEvent;
    stripe.webhooks.constructEvent = ((body: any) => JSON.parse(body)) as any;

    const webhookReq15 = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "mock_signature",
      },
      body: JSON.stringify({
        id: `evt_test_${Date.now()}`,
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: e2eStripePi,
            amount: 4000,
            currency: "usd",
            status: "succeeded",
          },
        },
      }),
    });

    const webhookRes15 = await stripeWebhookHandler(webhookReq15);
    assert(webhookRes15.status === 200, "Webhook returns 200 after gracefully placing order into MANUAL_REVIEW on refund failure");

    const orderAfterWebhook15 = await prisma.order.findUnique({ where: { id: e2eOrder.id } });
    assert(orderAfterWebhook15?.status === "MANUAL_REVIEW", "Order transitioned to MANUAL_REVIEW");
    assert(orderAfterWebhook15?.paymentStatus === "PAID", "Order paymentStatus is PAID");
    assert(orderAfterWebhook15?.stockReserved === false, "Order stockReserved remains false");
    assert(orderAfterWebhook15?.manualReviewReason === "LATE_PAYMENT_OUT_OF_STOCK_REFUND_FAILED", "Order manualReviewReason records refund failure");

    // Admin cancels the order from MANUAL_REVIEW
    const adminCancelRes15 = await updateOrderStatus(e2eOrder.id, "CANCELLED", "Merchant cancelled manual review order");
    assert(adminCancelRes15.success, "Admin cancellation of Case (b) MANUAL_REVIEW succeeds");

    const orderFinal15 = await prisma.order.findUnique({ where: { id: e2eOrder.id } });
    assert(orderFinal15?.status === "CANCELLED", "Order status is now CANCELLED");
    assert(orderFinal15?.stockReserved === false, "stockReserved remains false after cancel");

    const variantStockFinal15 = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock;
    assert(variantStockFinal15 === 0, `Variant stock remains UNCHANGED at 0 (did not restock unheld stock)`);

    const couponFinal15 = await prisma.coupon.findUnique({ where: { id: e2eCoupon.id } });
    assert(couponFinal15?.usedCount === 0, `Coupon usedCount remains UNCHANGED at 0 (did not decrement unheld coupon)`);

    // Restore stock and mocks
    stripe.refunds.create = originalStripeRefundCreate15;
    stripe.webhooks.constructEvent = originalConstructEvent15;
    await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: stockBaseline15 } });

    // =========================================================================
    // TEST 16: Stripe Late-Payment Catch - Non-stock DB error inside transaction after claim, then retry succeeds (Item 2 & Check 5)
    // =========================================================================
    console.log("\n--- TEST 16: Stripe Late-Payment Catch - Non-stock DB errors rethrow (HTTP 500) and retry succeeds ---");
    const dbErrStripePi = `pi_dberr_${Date.now()}`;
    const dbErrOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-DBERR-${Date.now()}`,
        currency: "USD",
        subtotal: 50,
        shipping: 0,
        discount: 0,
        total: 50,
        paymentMethod: "STRIPE",
        paymentStatus: "PENDING",
        status: "CANCELLED",
        stockReserved: false,
        stripePaymentIntentId: dbErrStripePi,
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku,
              price: 50,
              quantity: 1,
            },
          ],
        },
      },
    });
    createdOrderIds.push(dbErrOrder.id);

    let refundCalled16 = false;
    const trackedStripeRefundCreate16 = stripe.refunds.create;
    stripe.refunds.create = (async () => {
      refundCalled16 = true;
      return { id: `ref_mock_${Date.now()}` };
    }) as any;

    const originalConstructEvent16 = stripe.webhooks.constructEvent;
    stripe.webhooks.constructEvent = ((body: any) => JSON.parse(body)) as any;

    const stockBeforeDbErr = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock ?? 0;

    // Simulate transient database failure inside transaction right AFTER the claim
    let simulateDbError = true;
    const originalPrismaTransaction = prisma.$transaction;
    (prisma as any).$transaction = async (fn: any, options?: any) => {
      if (typeof fn === "function" && simulateDbError) {
        return (originalPrismaTransaction as any).apply(prisma, [
          async (tx: any) => {
            const originalUpdateMany = tx.order.updateMany;
            tx.order.updateMany = async (...args: any[]) => {
              const res = await originalUpdateMany.apply(tx.order, args);
              // Injected DB crash right inside the transaction after the claim:
              throw new Error("PrismaClientInitializationError: Connection pool timeout simulated after claim");
            };
            return fn(tx);
          },
          options,
        ]);
      }
      return (originalPrismaTransaction as any).apply(prisma, [fn, options]);
    };

    const webhookPayload16 = JSON.stringify({
      id: `evt_dberr_${Date.now()}`,
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: dbErrStripePi,
          amount: 5000,
          currency: "usd",
          status: "succeeded",
        },
      },
    });

    const createWebhookReq16 = () =>
      new NextRequest("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "mock_signature",
        },
        body: webhookPayload16,
      });

    // Attempt 1: Injected DB error triggers rollback & HTTP 500
    const webhookRes16 = await stripeWebhookHandler(createWebhookReq16());
    assert(webhookRes16.status === 500, "Webhook returns HTTP 500 on unexpected non-stock error so Stripe retries");
    assert(!refundCalled16, "Auto-refund was NOT triggered on simulated DB error (only InsufficientStockError triggers refund)");

    const orderAfterDbErr = await prisma.order.findUnique({ where: { id: dbErrOrder.id } });
    assert(orderAfterDbErr?.status === "CANCELLED", "Order remains in CANCELLED state due to transaction rollback");
    assert(orderAfterDbErr?.paymentStatus === "PENDING", "Order paymentStatus remains PENDING");

    // Attempt 2: Stripe retries delivery after DB recovers -> Order is successfully reinstated
    simulateDbError = false;
    const retryRes16 = await stripeWebhookHandler(createWebhookReq16());
    assert(retryRes16.status === 200, "Retry delivery succeeds with 200 OK after DB recovers");

    const orderAfterRetry = await prisma.order.findUnique({ where: { id: dbErrOrder.id } });
    assert(orderAfterRetry?.status === "PROCESSING", "Order reinstated to PROCESSING upon retry");
    assert(orderAfterRetry?.paymentStatus === "PAID", "Order paymentStatus updated to PAID upon retry");
    assert(orderAfterRetry?.stockReserved === true, "stockReserved set to true upon retry reinstatement");

    const stockAfterRetry = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock ?? 0;
    assert(stockAfterRetry === stockBeforeDbErr - 1, `Stock successfully decremented on retry (${stockBeforeDbErr} -> ${stockAfterRetry})`);

    // Restore mocks
    (prisma as any).$transaction = originalPrismaTransaction;
    stripe.refunds.create = trackedStripeRefundCreate16;
    stripe.webhooks.constructEvent = originalConstructEvent16;
    await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: stockBeforeDbErr } });

    // =========================================================================
    // TEST 17: BUG-003 - GET /api/orders/[id]/status Read-Only & PII Guard
    // =========================================================================
    console.log("\n--- TEST 17: BUG-003 - GET /api/orders/[id]/status Read-Only & PII Guard ---");
    const testSecretEmail = "private_customer@example.com";
    const testPiiAddress = await prisma.address.create({
      data: {
        fullName: "Secret Agent Customer",
        phone: "9800000000",
        line1: "123 Classified St",
        city: "Secret City",
        state: "Bagmati",
        postalCode: "44600",
        country: "NP",
      },
    });

    const piiOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-PII-${Date.now()}`,
        currency: "USD",
        subtotal: 100,
        shipping: 10,
        discount: 0,
        total: 110,
        paymentMethod: "STRIPE",
        paymentStatus: "PENDING",
        status: "PENDING",
        guestEmail: testSecretEmail,
        guestName: "Secret Agent Customer",
        addressId: testPiiAddress.id,
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku,
              price: 100,
              quantity: 1,
            },
          ],
        },
      },
    });
    createdOrderIds.push(piiOrder.id);

    // 1. Unauthenticated request without matching email (Public IDOR attempt)
    const publicReq = new NextRequest(`http://localhost:3000/api/orders/${piiOrder.id}/status`, {
      method: "GET",
      headers: { "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200)}` },
    });
    const publicRes = await orderStatusHandler(publicReq, { params: Promise.resolve({ id: piiOrder.id }) });
    assert(publicRes.status === 200, "Public request returns 200 OK");
    const publicData = await publicRes.json();
    assert(publicData.order?.status === "PENDING", "Public response includes status");
    assert(publicData.order?.paymentStatus === "PENDING", "Public response includes paymentStatus");
    assert(!publicData.order?.address, "Public response REDACTS customer address (no PII leak)");
    assert(!publicData.order?.items, "Public response REDACTS items purchased (no PII leak)");
    assert(publicData.order?.total === undefined, "Public response REDACTS pricing totals");

    // 2. Request with incorrect email
    const wrongEmailReq = new NextRequest(`http://localhost:3000/api/orders/${piiOrder.id}/status?email=intruder@attacker.com`, {
      method: "GET",
      headers: { "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200)}` },
    });
    const wrongEmailRes = await orderStatusHandler(wrongEmailReq, { params: Promise.resolve({ id: piiOrder.id }) });
    const wrongEmailData = await wrongEmailRes.json();
    assert(!wrongEmailData.order?.address && !wrongEmailData.order?.items, "Request with non-matching email REDACTS all PII");

    // 3. Request with MATCHING email
    const matchingEmailReq = new NextRequest(`http://localhost:3000/api/orders/${piiOrder.id}/status?email=${encodeURIComponent(testSecretEmail)}`, {
      method: "GET",
      headers: { "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200)}` },
    });
    const matchingEmailRes = await orderStatusHandler(matchingEmailReq, { params: Promise.resolve({ id: piiOrder.id }) });
    assert(matchingEmailRes.status === 200, "Matching email request returns 200 OK");
    const matchingData = await matchingEmailRes.json();
    assert(Boolean(matchingData.order?.address), "Matching email request successfully retrieves address");
    assert(matchingData.order?.address?.line1 === "123 Classified St", "Matching email retrieves shipping line1");
    assert(matchingData.order?.address?.phone === "***-***-0000", "Matching email masks recipient phone number");
    assert(matchingData.order?.items?.length === 1, "Matching email retrieves order items");
    assert(matchingData.order?.total === 110, "Matching email retrieves order total");

    // 4. Rate-limiting verification
    const spamIp = `203.0.113.${Date.now() % 250}`;
    let hitRateLimit = false;
    for (let i = 0; i < 25; i++) {
      const spamReq = new NextRequest(`http://localhost:3000/api/orders/${piiOrder.id}/status`, {
        method: "GET",
        headers: { "x-forwarded-for": spamIp },
      });
      const spamRes = await orderStatusHandler(spamReq, { params: Promise.resolve({ id: piiOrder.id }) });
      if (spamRes.status === 429) {
        hitRateLimit = true;
        break;
      }
    }
    assert(hitRateLimit, "Status endpoint rate-limits excessive queries per IP with HTTP 429");

  } catch (err) {
    console.error("Test execution caught unexpected exception:", err);
    failed++;
  } finally {
    // Restore mocks and dynamic config
    stripe.paymentIntents.create = originalStripeCreate;
    global.fetch = originalFetch;
    delete COUNTRIES.DE;
    delete SHIPPING_RULES.DE;

    // Cleanup test data strictly by ID (No prefix-based bulk deletes)
    console.log("\nCleaning up test artifacts...");
    const validOrderIds = createdOrderIds.filter((id): id is string => Boolean(id));
    if (validOrderIds.length > 0) {
      await prisma.orderItem.deleteMany({ where: { orderId: { in: validOrderIds } } });
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: validOrderIds } } });
      await prisma.address.deleteMany({ where: { orders: { some: { id: { in: validOrderIds } } } } });
      await prisma.order.deleteMany({ where: { id: { in: validOrderIds } } });
    }
    if (createdCouponCodes.length > 0) {
      await prisma.coupon.deleteMany({
        where: {
          code: { in: createdCouponCodes },
        },
      });
    }
    await prisma.$disconnect();
  }

  console.log(`\n======================================================`);
  console.log(`Test Execution Summary: ${passed} passed, ${failed} failed.`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
