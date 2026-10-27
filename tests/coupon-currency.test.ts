import "./setup-test-db";
import { NextRequest } from "next/server";
import { prisma } from "../lib/db/prisma";
import { reserveCouponUsage, releaseCouponUsage } from "../lib/checkout/coupon";
import { calculateOrderPricing } from "../lib/checkout/pricing";
import { releaseOrderStock, decrementStockWithLock } from "../lib/checkout/stock";
import { stripe, toStripeSmallestUnit, confirmStripePayment } from "../lib/services/stripe";
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
import { GET as reconcileStripeCronHandler } from "../app/api/cron/reconcile-stripe/route";
import { updateOrderStatus } from "../app/admin/orders/[id]/actions";
import { cancelCustomerOrder } from "../app/account/orders/[id]/actions";
import { GET as orderStatusHandler } from "../app/api/orders/[id]/status/route";
import * as emailService from "../lib/services/email";
import { register as bootRegister } from "../instrumentation";

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
        cancelReason: "EXPIRED",
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
        cancelReason: "EXPIRED",
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
        cancelReason: "EXPIRED",
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
        cancelReason: "EXPIRED",
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
        cancelReason: "EXPIRED",
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

    // 2. Request with ?email= query param (Removed support: MUST NOT unlock PII)
    const queryEmailReq = new NextRequest(`http://localhost:3000/api/orders/${piiOrder.id}/status?email=${encodeURIComponent(testSecretEmail)}`, {
      method: "GET",
      headers: { "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200)}` },
    });
    const queryEmailRes = await orderStatusHandler(queryEmailReq, { params: Promise.resolve({ id: piiOrder.id }) });
    const queryEmailData = await queryEmailRes.json();
    assert(!queryEmailData.order?.address && !queryEmailData.order?.items, "Query param ?email= does NOT unlock PII (support removed for header-only auth)");

    // 3. Request with non-matching x-order-email header
    const wrongHeaderReq = new NextRequest(`http://localhost:3000/api/orders/${piiOrder.id}/status`, {
      method: "GET",
      headers: {
        "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200)}`,
        "x-order-email": "intruder@attacker.com",
      },
    });
    const wrongHeaderRes = await orderStatusHandler(wrongHeaderReq, { params: Promise.resolve({ id: piiOrder.id }) });
    const wrongHeaderData = await wrongHeaderRes.json();
    assert(!wrongHeaderData.order?.address && !wrongHeaderData.order?.items, "Non-matching x-order-email header REDACTS all PII");

    // 4. Request with MATCHING x-order-email header
    const matchingHeaderReq = new NextRequest(`http://localhost:3000/api/orders/${piiOrder.id}/status`, {
      method: "GET",
      headers: {
        "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200)}`,
        "x-order-email": testSecretEmail,
      },
    });
    const matchingHeaderRes = await orderStatusHandler(matchingHeaderReq, { params: Promise.resolve({ id: piiOrder.id }) });
    assert(matchingHeaderRes.status === 200, "Matching x-order-email header returns 200 OK");
    const matchingData = await matchingHeaderRes.json();
    assert(Boolean(matchingData.order?.address), "Matching x-order-email successfully retrieves address");
    assert(matchingData.order?.address?.line1 === "123 Classified St", "Matching x-order-email retrieves shipping line1");
    assert(matchingData.order?.address?.phone === "***-***-0000", "Matching x-order-email masks recipient phone number");
    assert(matchingData.order?.items?.length === 1, "Matching x-order-email retrieves order items");
    assert(matchingData.order?.total === 110, "Matching x-order-email retrieves order total");

    // 5. Rate-limiting verification (keyed on IP + Order ID)
    const spamIp = `203.0.113.${Date.now() % 250}`;
    let hitRateLimit = false;
    for (let i = 0; i < 35; i++) {
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
    assert(hitRateLimit, "Status endpoint rate-limits excessive queries for an order per IP with HTTP 429");

    // Verify rate limit is keyed on IP + Order ID: A second order from the same IP is NOT blocked
    const otherOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-OTHER-${Date.now()}`,
        currency: "USD",
        subtotal: 50,
        shipping: 0,
        discount: 0,
        total: 50,
        paymentMethod: "COD",
        paymentStatus: "PENDING",
        status: "PENDING",
      },
    });
    createdOrderIds.push(otherOrder.id);

    const otherOrderReq = new NextRequest(`http://localhost:3000/api/orders/${otherOrder.id}/status`, {
      method: "GET",
      headers: { "x-forwarded-for": spamIp },
    });
    const otherOrderRes = await orderStatusHandler(otherOrderReq, { params: Promise.resolve({ id: otherOrder.id }) });
    assert(otherOrderRes.status === 200, "Different order ID from the same IP is NOT blocked (rate limit keyed on IP + order ID)");

    // =========================================================================
    // TEST 18: Webhook Never Arrives -> Cleanup Cron Confirms Stripe Order
    // =========================================================================
    console.log("\n--- TEST 18: Webhook Never Arrives -> Cleanup Cron Confirms Stripe Order ---");
    const missedWebhookPi = `pi_missed_webhook_${Date.now()}`;
    const missedWebhookOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-MISSED-WH-${Date.now()}`,
        currency: "USD",
        subtotal: 50,
        shipping: 0,
        discount: 0,
        total: 50,
        paymentMethod: "STRIPE",
        paymentStatus: "PENDING",
        status: "PENDING",
        stripePaymentIntentId: missedWebhookPi,
        createdAt: new Date(Date.now() - 35 * 60 * 1000), // 35 min old
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
    createdOrderIds.push(missedWebhookOrder.id);

    // Mock stripe.paymentIntents.retrieve returning succeeded
    const savedStripeRetrieve18 = stripe.paymentIntents.retrieve;
    stripe.paymentIntents.retrieve = (async () => ({
      id: missedWebhookPi,
      status: "succeeded",
      amount: 5000,
      currency: "usd",
    })) as any;

    const cronRes18 = await cleanupCronHandler(cronReq());
    const cronData18 = await cronRes18.json();

    const orderAfterCron18 = await prisma.order.findUnique({
      where: { id: missedWebhookOrder.id },
      include: { statusHistory: true },
    });

    assert(orderAfterCron18?.status === "PROCESSING", "Order transitioned to PROCESSING by cleanup cron");
    assert(orderAfterCron18?.paymentStatus === "PAID", "Order marked as PAID by cleanup cron via confirmStripePayment");
    assert(cronData18.results.confirmed >= 1, "Cron reported confirmed >= 1 for recovered Stripe order");
    assert(
      Boolean(orderAfterCron18?.statusHistory.some((h) => h.note?.includes("cleanup_cron"))),
      "Status history records payment confirmed via cleanup_cron"
    );

    stripe.paymentIntents.retrieve = savedStripeRetrieve18;

    // --- TEST 19: confirmStripePayment - Concurrent Callers ---
    console.log("\n--- TEST 19: confirmStripePayment - Concurrent Callers Parity ---");
    const concurrentPi = `pi_concurrent_${Date.now()}`;
    const concurrentOrder = await prisma.order.create({
      data: {
        orderNumber: `TEST-ORD-CONCUR-${Date.now()}`,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "STRIPE",
        stripePaymentIntentId: concurrentPi,
        currency: "USD",
        subtotal: 75.0,
        shipping: 0.0,
        tax: 0.0,
        discount: 0.0,
        total: 75.0,
        stockReserved: true,
        guestEmail: "concurrent_customer@example.com",
      },
    });
    createdOrderIds.push(concurrentOrder.id);

    // Spy on email dispatch to assert exactly one email is sent
    let emailSentCount19 = 0;
    (global as any).__onEmailSent = (type: string, id: string) => {
      if (type === "order_confirmation" && id === concurrentOrder.id) {
        emailSentCount19++;
      }
    };

    // Launch 5 concurrent calls to confirmStripePayment for the exact same order
    const concurrentResults = await Promise.all([
      confirmStripePayment(concurrentOrder.id, {
        paymentIntentId: concurrentPi,
        amount: 7500,
        currency: "usd",
        source: "Worker-1",
      }),
      confirmStripePayment(concurrentOrder.id, {
        paymentIntentId: concurrentPi,
        amount: 7500,
        currency: "usd",
        source: "Worker-2",
      }),
      confirmStripePayment(concurrentOrder.id, {
        paymentIntentId: concurrentPi,
        amount: 7500,
        currency: "usd",
        source: "Worker-3",
      }),
      confirmStripePayment(concurrentOrder.id, {
        paymentIntentId: concurrentPi,
        amount: 7500,
        currency: "usd",
        source: "Worker-4",
      }),
      confirmStripePayment(concurrentOrder.id, {
        paymentIntentId: concurrentPi,
        amount: 7500,
        currency: "usd",
        source: "Worker-5",
      }),
    ]);

    delete (global as any).__onEmailSent;

    const winnerCount = concurrentResults.filter((r) => r.success && r.count === 1).length;
    const loserCount = concurrentResults.filter((r) => !r.success && r.count === 0).length;

    assert(winnerCount === 1, "Exactly one concurrent caller receives count = 1");
    assert(loserCount === 4, "Remaining 4 concurrent callers receive count = 0");
    assert(emailSentCount19 === 1, "Concurrent test asserts EXACTLY ONE customer confirmation email dispatched");

    const concurrentOrderAfter = await prisma.order.findUnique({
      where: { id: concurrentOrder.id },
      include: { statusHistory: true },
    });

    assert(concurrentOrderAfter?.status === "PROCESSING", "Order transitioned to PROCESSING exactly once");
    assert(concurrentOrderAfter?.paymentStatus === "PAID", "Order paymentStatus transitioned to PAID");
    assert(
      concurrentOrderAfter?.statusHistory.length === 1,
      "OrderStatusHistory has exactly ONE entry despite 5 concurrent callers"
    );

    // --- TEST 20: confirmStripePayment - Amount & Currency Mismatch ---
    console.log("\n--- TEST 20: confirmStripePayment - Amount & Currency Mismatch ---");
    const mismatchPi = `pi_mismatch_${Date.now()}`;
    const mismatchOrder = await prisma.order.create({
      data: {
        orderNumber: `TEST-ORD-MISMATCH-${Date.now()}`,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "STRIPE",
        stripePaymentIntentId: mismatchPi,
        currency: "USD",
        subtotal: 100.0,
        shipping: 0.0,
        tax: 0.0,
        discount: 0.0,
        total: 100.0, // Expected smallest unit: 10000
        stockReserved: true,
      },
    });
    createdOrderIds.push(mismatchOrder.id);

    // Simulate PaymentIntent delivering 5000 cents ($50.00) instead of 10000 ($100.00)
    const mismatchResult = await confirmStripePayment(mismatchOrder.id, {
      paymentIntentId: mismatchPi,
      amount: 5000,
      currency: "usd",
      source: "Webhook",
    });

    assert(mismatchResult.success === false, "confirmStripePayment returns success: false on amount mismatch");
    assert(mismatchResult.status === "MANUAL_REVIEW", "confirmStripePayment returns status: MANUAL_REVIEW");
    assert(mismatchResult.reason === "STRIPE_AMOUNT_MISMATCH", "confirmStripePayment records reason: STRIPE_AMOUNT_MISMATCH");

    const mismatchOrderAfter = await prisma.order.findUnique({
      where: { id: mismatchOrder.id },
    });
    assert(mismatchOrderAfter?.status === "MANUAL_REVIEW", "Order transitioned to MANUAL_REVIEW on amount mismatch");
    assert(mismatchOrderAfter?.manualReviewReason === "STRIPE_AMOUNT_MISMATCH", "Order records manualReviewReason: STRIPE_AMOUNT_MISMATCH");
    assert(mismatchOrderAfter?.stockReserved === true, "Stock remains reserved (case a) on amount mismatch");

    // --- TEST 21: Customer/Admin Cancelled Order Late Payment Auto-Refunds (Does Not Reinstate) ---
    console.log("\n--- TEST 21: Cancelled Order Late Payment: Customer/Admin Cancel Auto-Refunds ---");
    const custCancelPi = `pi_cust_cancel_${Date.now()}`;
    const custCancelOrder = await prisma.order.create({
      data: {
        orderNumber: `TEST-ORD-CUSTCANCEL-${Date.now()}`,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "STRIPE",
        stripePaymentIntentId: custCancelPi,
        currency: "USD",
        subtotal: 60.0,
        shipping: 0.0,
        tax: 0.0,
        discount: 0.0,
        total: 60.0,
        stockReserved: true,
        items: {
          create: [
            {
              variantId: variant.id,
              quantity: 1,
              price: 60.0,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku || "SKU-TEST-CUST",
            },
          ],
        },
      },
    });
    createdOrderIds.push(custCancelOrder.id);

    // Customer cancels order via releaseOrderStock with cancelReason: "CUSTOMER"
    await releaseOrderStock(
      prisma,
      custCancelOrder.id,
      "Customer cancelled order",
      { cancelReason: "CUSTOMER" }
    );

    const stockBeforeLatePayment = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock || 0;

    // Simulate mock Stripe refund
    let refundCreatedForPi = "";
    const savedStripeRefundCreate = stripe.refunds.create;
    stripe.refunds.create = (async (params: any) => {
      refundCreatedForPi = params.payment_intent;
      return { id: `re_mock_${Date.now()}`, status: "succeeded" };
    }) as any;

    // Now late payment arrives for the customer-cancelled order
    const lateCustResult = await confirmStripePayment(custCancelOrder.id, {
      paymentIntentId: custCancelPi,
      amount: 6000,
      currency: "usd",
      source: "Webhook",
    });

    stripe.refunds.create = savedStripeRefundCreate;

    const custCancelOrderAfter = await prisma.order.findUnique({
      where: { id: custCancelOrder.id },
    });
    const stockAfterLatePayment = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock || 0;

    assert(refundCreatedForPi === custCancelPi, "Auto-refund was issued via Stripe for customer-cancelled order");
    assert(custCancelOrderAfter?.status === "CANCELLED", "Order remains CANCELLED (not reinstated to PROCESSING)");
    assert(custCancelOrderAfter?.paymentStatus === "REFUNDED", "Order paymentStatus updated to REFUNDED");
    assert(stockAfterLatePayment === stockBeforeLatePayment, "Stock was NOT decremented for customer-cancelled late payment");

    // --- TEST 22: Rate Limiting: Scanning Many Order IDs from One IP Gets HTTP 429 ---
    console.log("\n--- TEST 22: Rate Limiting: Global Scanning Many Order IDs Gets HTTP 429 ---");
    const savedGlobalEnv22 = process.env.RATE_LIMIT_GLOBAL_PER_IP;
    process.env.RATE_LIMIT_GLOBAL_PER_IP = "40"; // Validate env-configurability

    const scannerIp = "198.51.100.88";
    let hit429 = false;
    let retryAfterHeaderFound = false;

    // Attempt 45 rapid queries to different order IDs from the same IP (global limit: 40)
    for (let i = 1; i <= 45; i++) {
      const scanReq = new NextRequest(`https://shoestore.com/api/orders/scan-order-id-${i}/status`, {
        headers: { "x-forwarded-for": scannerIp },
      });
      const scanRes = await orderStatusHandler(scanReq, { params: Promise.resolve({ id: `scan-order-id-${i}` }) });

      if (scanRes.status === 429) {
        hit429 = true;
        if (scanRes.headers.get("Retry-After")) {
          retryAfterHeaderFound = true;
        }
        break;
      }
    }

    if (savedGlobalEnv22) {
      process.env.RATE_LIMIT_GLOBAL_PER_IP = savedGlobalEnv22;
    } else {
      delete process.env.RATE_LIMIT_GLOBAL_PER_IP;
    }

    assert(hit429, "Scanning many order IDs from a single IP triggers global HTTP 429 rate limit");
    assert(retryAfterHeaderFound, "Global 429 rate limit response includes Retry-After header");

    // =========================================================================
    // TEST 23: confirmStripePayment - Late payment + wrong amount + EXPIRED order -> MANUAL_REVIEW (Item 5)
    // =========================================================================
    console.log("\n--- TEST 23: confirmStripePayment - Late payment + wrong amount + EXPIRED order -> MANUAL_REVIEW ---");
    const lateMismatchPi = `pi_late_mismatch_${Date.now()}`;
    const lateMismatchOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-LATE-MISMATCH-${Date.now()}`,
        currency: "USD",
        subtotal: 80,
        shipping: 0,
        discount: 0,
        total: 80, // expected: 8000 cents
        paymentMethod: "STRIPE",
        paymentStatus: "PENDING",
        status: "CANCELLED",
        cancelReason: "EXPIRED",
        stockReserved: false,
        stripePaymentIntentId: lateMismatchPi,
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku || "SKU-MISMATCH",
              price: 80,
              quantity: 1,
            },
          ],
        },
      },
    });
    createdOrderIds.push(lateMismatchOrder.id);

    const stockBeforeMismatch = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock || 0;

    // Payment arrives with 4000 cents ($40) instead of 8000 ($80)
    const mismatchRes = await confirmStripePayment(lateMismatchOrder.id, {
      paymentIntentId: lateMismatchPi,
      amount: 4000,
      currency: "usd",
      source: "Webhook",
    });

    assert(mismatchRes.success === false, "confirmStripePayment returns success: false on late payment amount mismatch");
    assert(mismatchRes.status === "MANUAL_REVIEW", "confirmStripePayment returns status: MANUAL_REVIEW");
    assert(mismatchRes.reason === "STRIPE_AMOUNT_MISMATCH", "confirmStripePayment records reason: STRIPE_AMOUNT_MISMATCH");

    const lateMismatchOrderAfter = await prisma.order.findUnique({ where: { id: lateMismatchOrder.id } });
    assert(lateMismatchOrderAfter?.status === "MANUAL_REVIEW", "Late mismatched order transitioned to MANUAL_REVIEW");
    assert(lateMismatchOrderAfter?.manualReviewReason === "STRIPE_AMOUNT_MISMATCH", "Order records manualReviewReason: STRIPE_AMOUNT_MISMATCH");

    const stockAfterMismatch = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock || 0;
    assert(stockAfterMismatch === stockBeforeMismatch, "Stock was NOT decremented for late payment with amount mismatch");

    // =========================================================================
    // TEST 24: handleLatePayment with cancelReason: null - Stripe Auto-Refund & Khalti MANUAL_REVIEW (Item 3)
    // =========================================================================
    console.log("\n--- TEST 24: handleLatePayment with cancelReason: null (Never Reinstate) ---");
    // 24a. Stripe late payment with cancelReason: null -> Auto-refund
    const nullReasonStripePi = `pi_null_reason_${Date.now()}`;
    const nullReasonOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-NULL-REASON-${Date.now()}`,
        currency: "USD",
        subtotal: 50,
        shipping: 0,
        discount: 0,
        total: 50,
        paymentMethod: "STRIPE",
        paymentStatus: "PENDING",
        status: "CANCELLED",
        cancelReason: null, // cancelReason is explicitly null
        stockReserved: false,
        stripePaymentIntentId: nullReasonStripePi,
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku || "SKU-NULL-REASON",
              price: 50,
              quantity: 1,
            },
          ],
        },
      },
    });
    createdOrderIds.push(nullReasonOrder.id);

    let stripeRefundPi24 = "";
    const savedStripeRefund24 = stripe.refunds.create;
    stripe.refunds.create = (async (params: any) => {
      stripeRefundPi24 = params.payment_intent;
      return { id: `ref_null_${Date.now()}`, status: "succeeded" };
    }) as any;

    const nullReasonResult = await confirmStripePayment(nullReasonOrder.id, {
      paymentIntentId: nullReasonStripePi,
      amount: 5000,
      currency: "usd",
      source: "Webhook",
    });

    stripe.refunds.create = savedStripeRefund24;

    const nullReasonOrderAfter = await prisma.order.findUnique({ where: { id: nullReasonOrder.id } });
    assert(stripeRefundPi24 === nullReasonStripePi, "Stripe auto-refund was issued when cancelReason is null");
    assert(nullReasonOrderAfter?.status === "CANCELLED", "Order remains CANCELLED (never reinstated when cancelReason is null)");
    assert(nullReasonOrderAfter?.paymentStatus === "REFUNDED", "Order paymentStatus updated to REFUNDED");

    // 24b. Khalti late payment with cancelReason: null -> MANUAL_REVIEW
    const nullReasonKhaltiPidx = `pidx_null_khalti_${Date.now()}`;
    const nullReasonKhaltiOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-KHALTI-NULL-${Date.now()}`,
        currency: "NPR",
        subtotal: 2500,
        shipping: 0,
        discount: 0,
        total: 2500,
        paymentMethod: "KHALTI",
        paymentStatus: "PENDING",
        status: "CANCELLED",
        cancelReason: null, // cancelReason is explicitly null
        stockReserved: false,
        khaltiPidx: nullReasonKhaltiPidx,
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku || "SKU-KHALTI-NULL",
              price: 2500,
              quantity: 1,
            },
          ],
        },
      },
    });
    createdOrderIds.push(nullReasonKhaltiOrder.id);

    mockKhaltiLookupStatus = "Completed";
    mockKhaltiLookupAmountOverride = 250000;

    const khaltiNullReq = new NextRequest(
      `http://localhost:3000/api/checkout/khalti/callback?pidx=${nullReasonKhaltiPidx}&purchase_order_id=${nullReasonKhaltiOrder.id}`,
      { method: "GET" }
    );
    await khaltiCallbackHandler(khaltiNullReq);

    const khaltiNullOrderAfter = await prisma.order.findUnique({ where: { id: nullReasonKhaltiOrder.id } });
    assert(khaltiNullOrderAfter?.status === "MANUAL_REVIEW", "Khalti late payment with cancelReason null moved to MANUAL_REVIEW");
    assert(khaltiNullOrderAfter?.paymentStatus === "PAID", "Khalti late payment with cancelReason null marked as PAID");
    assert(khaltiNullOrderAfter?.manualReviewReason === "LATE_PAYMENT_NON_EXPIRED", "Khalti late payment records manualReviewReason: LATE_PAYMENT_NON_EXPIRED");
    assert(khaltiNullOrderAfter?.stockReserved === false, "Khalti late payment with cancelReason null leaves stockReserved: false");

    // =========================================================================
    // TEST 25: payment_intent.canceled - Derives cancelReason & Never Overwrites (Item 3)
    // =========================================================================
    console.log("\n--- TEST 25: payment_intent.canceled - Derives cancelReason & Never Overwrites ---");
    // 25a. Order with no cancelReason receives abandoned cancellation -> derives EXPIRED
    const piCancelExpired = `pi_cancel_exp_${Date.now()}`;
    const orderCancelExpired = await prisma.order.create({
      data: {
        orderNumber: `ORD-CANCEL-EXP-${Date.now()}`,
        currency: "USD",
        subtotal: 50,
        shipping: 0,
        discount: 0,
        total: 50,
        paymentMethod: "STRIPE",
        paymentStatus: "PENDING",
        status: "PENDING",
        stockReserved: true,
        stripePaymentIntentId: piCancelExpired,
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku || "SKU-PI-CANCEL-EXP",
              price: 50,
              quantity: 1,
            },
          ],
        },
      },
    });
    createdOrderIds.push(orderCancelExpired.id);

    const originalConstructEvent25 = stripe.webhooks.constructEvent;
    stripe.webhooks.constructEvent = ((body: any) => JSON.parse(body)) as any;

    const cancelExpiredReq = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": "mock_sig" },
      body: JSON.stringify({
        id: `evt_cancel_exp_${Date.now()}`,
        type: "payment_intent.canceled",
        data: {
          object: {
            id: piCancelExpired,
            cancellation_reason: "abandoned",
          },
        },
      }),
    });
    const cancelExpiredRes = await stripeWebhookHandler(cancelExpiredReq);
    assert(cancelExpiredRes.status === 200, "payment_intent.canceled webhook processed successfully");

    const orderCancelExpiredAfter = await prisma.order.findUnique({ where: { id: orderCancelExpired.id } });
    assert(orderCancelExpiredAfter?.status === "CANCELLED", "Order transitioned to CANCELLED on payment_intent.canceled");
    assert(orderCancelExpiredAfter?.cancelReason === "EXPIRED", "cancelReason derived as EXPIRED from abandoned cancellation_reason");

    // 25b. Order with existing cancelReason CUSTOMER is never overwritten
    const piCancelKeepReason = `pi_cancel_keep_${Date.now()}`;
    const orderCancelKeepReason = await prisma.order.create({
      data: {
        orderNumber: `ORD-CANCEL-KEEP-${Date.now()}`,
        currency: "USD",
        subtotal: 50,
        shipping: 0,
        discount: 0,
        total: 50,
        paymentMethod: "STRIPE",
        paymentStatus: "PENDING",
        status: "CANCELLED",
        cancelReason: "CUSTOMER", // Existing reason set by customer cancellation
        stockReserved: false,
        stripePaymentIntentId: piCancelKeepReason,
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku || "SKU-PI-CANCEL-KEEP",
              price: 50,
              quantity: 1,
            },
          ],
        },
      },
    });
    createdOrderIds.push(orderCancelKeepReason.id);

    const cancelKeepReq = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": "mock_sig" },
      body: JSON.stringify({
        id: `evt_cancel_keep_${Date.now()}`,
        type: "payment_intent.canceled",
        data: {
          object: {
            id: piCancelKeepReason,
            cancellation_reason: "abandoned", // Stripe says abandoned, but customer already cancelled
          },
        },
      }),
    });
    await stripeWebhookHandler(cancelKeepReq);

    const orderCancelKeepAfter = await prisma.order.findUnique({ where: { id: orderCancelKeepReason.id } });
    assert(orderCancelKeepAfter?.cancelReason === "CUSTOMER", "Existing cancelReason CUSTOMER is NEVER overwritten by webhook");
    stripe.webhooks.constructEvent = originalConstructEvent25;

    // =========================================================================
    // TEST 26: cancelCustomerOrder - Unpaid Orders Only & Succeeded Intent Abort (Item 4)
    // =========================================================================
    console.log("\n--- TEST 26: cancelCustomerOrder - Unpaid Orders Only & Succeeded Intent Abort ---");
    const testUser26 = await prisma.user.create({
      data: {
        email: `cust_${Date.now()}@example.com`,
        name: "Test Customer User",
        role: "USER",
      },
    });
    const testUserId = testUser26.id;
    (global as any).__mockCustomerSession = { user: { id: testUserId } };

    // 26a. Unpaid pending order where PaymentIntent has already succeeded -> Abort!
    const piSuccCust = `pi_succ_cust_${Date.now()}`;
    const orderSuccCust = await prisma.order.create({
      data: {
        orderNumber: `ORD-CUST-SUCC-${Date.now()}`,
        userId: testUserId,
        currency: "USD",
        subtotal: 70,
        shipping: 0,
        discount: 0,
        total: 70,
        paymentMethod: "STRIPE",
        paymentStatus: "PENDING",
        status: "PENDING",
        stockReserved: true,
        stripePaymentIntentId: piSuccCust,
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku || "SKU-CUST-SUCC",
              price: 70,
              quantity: 1,
            },
          ],
        },
      },
    });
    createdOrderIds.push(orderSuccCust.id);

    const savedRetrieve26 = stripe.paymentIntents.retrieve;
    stripe.paymentIntents.retrieve = (async (id: string) => {
      return { id, status: "succeeded" };
    }) as any;

    const cancelCustSuccRes = await cancelCustomerOrder(orderSuccCust.id);
    assert(cancelCustSuccRes.success === false, "cancelCustomerOrder aborts when PaymentIntent has already succeeded");
    assert(Boolean(cancelCustSuccRes.error?.includes("already been processed")), "Error informs user that payment already succeeded");

    const orderSuccCustAfter = await prisma.order.findUnique({ where: { id: orderSuccCust.id } });
    assert(orderSuccCustAfter?.status === "PENDING", "Order remains PENDING (untouched) when payment already succeeded");
    assert(orderSuccCustAfter?.stockReserved === true, "Stock remains reserved on aborted customer cancellation");

    // 26b. Unpaid pending order where PaymentIntent requires_payment_method -> Cancels PI first then order
    const piUnpaidCust = `pi_unpaid_cust_${Date.now()}`;
    const orderUnpaidCust = await prisma.order.create({
      data: {
        orderNumber: `ORD-CUST-UNPAID-${Date.now()}`,
        userId: testUserId,
        currency: "USD",
        subtotal: 70,
        shipping: 0,
        discount: 0,
        total: 70,
        paymentMethod: "STRIPE",
        paymentStatus: "PENDING",
        status: "PENDING",
        stockReserved: true,
        stripePaymentIntentId: piUnpaidCust,
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku || "SKU-CUST-UNPAID",
              price: 70,
              quantity: 1,
            },
          ],
        },
      },
    });
    createdOrderIds.push(orderUnpaidCust.id);

    stripe.paymentIntents.retrieve = (async (id: string) => {
      return { id, status: "requires_payment_method" };
    }) as any;

    let stripeCancelPiCalled = "";
    const savedCancel26 = stripe.paymentIntents.cancel;
    stripe.paymentIntents.cancel = (async (id: string) => {
      stripeCancelPiCalled = id;
      return { id, status: "canceled" };
    }) as any;

    const cancelCustUnpaidRes = await cancelCustomerOrder(orderUnpaidCust.id);
    assert(cancelCustUnpaidRes.success === true, "cancelCustomerOrder succeeds for unpaid order");
    assert(stripeCancelPiCalled === piUnpaidCust, "cancelCustomerOrder cancelled the Stripe PaymentIntent with Stripe first");

    const orderUnpaidCustAfter = await prisma.order.findUnique({ where: { id: orderUnpaidCust.id } });
    assert(orderUnpaidCustAfter?.status === "CANCELLED", "Order transitioned to CANCELLED");
    assert(orderUnpaidCustAfter?.cancelReason === "CUSTOMER", "Order cancelReason set to CUSTOMER");
    assert(orderUnpaidCustAfter?.stockReserved === false, "stockReserved set to false on customer cancellation");

    stripe.paymentIntents.retrieve = savedRetrieve26;
    stripe.paymentIntents.cancel = savedCancel26;
    delete (global as any).__mockCustomerSession;
    await prisma.user.delete({ where: { id: testUserId } });

    // =========================================================================
    // TEST 27: getClientIp - Rotating X-Forwarded-For per Request Still Hits HTTP 429 (Item 1)
    // =========================================================================
    console.log("\n--- TEST 27: getClientIp - Rotating X-Forwarded-For per Request Still Hits 429 ---");
    const targetOrderForIpTest = await prisma.order.create({
      data: {
        orderNumber: `ORD-IPTEST-${Date.now()}`,
        currency: "USD",
        subtotal: 50,
        shipping: 0,
        discount: 0,
        total: 50,
        paymentMethod: "STRIPE",
        paymentStatus: "PENDING",
        status: "PENDING",
      },
    });
    createdOrderIds.push(targetOrderForIpTest.id);

    const trustedGatewayIp = "198.51.100.77";
    let rotatingHit429 = false;

    // Attacker rotates the client IP (leftmost) on each request, but trusted hop (rightmost) is constant:
    for (let i = 1; i <= 35; i++) {
      const spoofedClientIp = `10.0.${Math.floor(i / 250)}.${i % 250}`;
      const rotReq = new NextRequest(`https://shoestore.com/api/orders/${targetOrderForIpTest.id}/status`, {
        headers: {
          "x-forwarded-for": `${spoofedClientIp}, ${trustedGatewayIp}`,
        },
      });
      const rotRes = await orderStatusHandler(rotReq, { params: Promise.resolve({ id: targetOrderForIpTest.id }) });
      if (rotRes.status === 429) {
        rotatingHit429 = true;
        break;
      }
    }

    assert(rotatingHit429, "Attacker rotating leftmost X-Forwarded-For STILL gets HTTP 429 (trusted rightmost hop enforced)");

    // =========================================================================
    // TEST 28: Reconciliation Sweep as a Real Cron Route (Item 2)
    // =========================================================================
    console.log("\n--- TEST 28: Reconciliation Sweep Cron Route ---");
    const sweepOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-SWEEP-${Date.now()}`,
        currency: "USD",
        subtotal: 65,
        shipping: 0,
        discount: 0,
        total: 65,
        paymentMethod: "STRIPE",
        paymentStatus: "PENDING",
        status: "PENDING",
        stripePaymentIntentId: `pi_sweep_matched_${Date.now()}`,
        stockReserved: true,
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku || "SKU-SWEEP",
              price: 65,
              quantity: 1,
            },
          ],
        },
      },
    });
    createdOrderIds.push(sweepOrder.id);

    const savedStripePiList = stripe.paymentIntents.list;
    stripe.paymentIntents.list = (async () => {
      return {
        data: [
          // 1. Succeeded intent carrying our store metadata for unpaid sweepOrder
          {
            id: sweepOrder.stripePaymentIntentId!,
            status: "succeeded",
            amount: 6500,
            currency: "usd",
            metadata: {
              orderId: sweepOrder.id,
              orderNumber: sweepOrder.orderNumber,
              store: "shoe-store",
            },
          },
          // 2. Foreign intent belonging to another application (no shoe-store metadata)
          {
            id: `pi_foreign_${Date.now()}`,
            status: "succeeded",
            amount: 9999,
            currency: "usd",
            metadata: { service: "other-app" },
          },
          // 3. Orphan intent: has shoe-store metadata, but no matching order in DB
          {
            id: `pi_orphan_${Date.now()}`,
            status: "succeeded",
            amount: 5500,
            currency: "usd",
            metadata: {
              orderId: "non_existent_order_id_orphan",
              orderNumber: "ORD-NONEXISTENT",
              store: "shoe-store",
            },
          },
        ],
      };
    }) as any;

    const reconcileCronReq = new NextRequest("http://localhost:3000/api/cron/reconcile-stripe", {
      method: "GET",
    });
    const reconcileCronRes = await reconcileStripeCronHandler(reconcileCronReq);
    const reconcileData = await reconcileCronRes.json();

    assert(reconcileCronRes.status === 200, "Reconciliation sweep cron route returns HTTP 200");
    assert(reconcileData.results.scanned === 3, "Cron scanned all 3 returned PaymentIntents");
    assert(reconcileData.results.matchedIntents === 2, "Cron filtered for only 2 intents carrying store metadata (ignored foreign intent)");
    assert(reconcileData.results.orphaned === 1, "Cron detected and alerted on exactly 1 orphan PaymentIntent");
    assert(reconcileData.results.confirmed >= 1, "Cron confirmed the unpaid store order");

    const sweepOrderAfter = await prisma.order.findUnique({ where: { id: sweepOrder.id } });
    assert(sweepOrderAfter?.status === "PROCESSING", "Unpaid order transitioned to PROCESSING by reconciliation sweep");
    assert(sweepOrderAfter?.paymentStatus === "PAID", "Unpaid order marked as PAID by reconciliation sweep");

    stripe.paymentIntents.list = savedStripePiList;

    // =========================================================================
    // TEST 29: Production Boot Check (Item 7)
    // =========================================================================
    console.log("\n--- TEST 29: Production Boot Check - Production Only & Sentry Initialized First ---");
    const savedNodeEnv = process.env.NODE_ENV;
    const savedAdminEmail = process.env.ADMIN_EMAIL;
    const savedSentryDsn = process.env.SENTRY_DSN;
    const savedUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const savedUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    // 29a. Development mode: Boot check is skipped (no fatal alert even if ADMIN_EMAIL is missing)
    (process.env as any).NODE_ENV = "development";
    delete process.env.ADMIN_EMAIL;
    let devBootErrorLogged = false;
    const savedConsoleError29 = console.error;
    console.error = (...args: any[]) => {
      if (args.some((a) => typeof a === "string" && a.includes("[CRITICAL BOOT CONFIG ERROR]"))) {
        devBootErrorLogged = true;
      }
      savedConsoleError29(...args);
    };

    await bootRegister();
    assert(!devBootErrorLogged, "Boot check is skipped in development mode (no fatal boot error logged)");

    // 29b. Production mode: Missing env variables trigger critical alert
    (process.env as any).NODE_ENV = "production";
    delete process.env.ADMIN_EMAIL;
    delete process.env.UPSTASH_REDIS_REST_URL;
    let prodBootErrorLogged = false;
    console.error = (...args: any[]) => {
      if (args.some((a) => typeof a === "string" && a.includes("[CRITICAL BOOT CONFIG ERROR]"))) {
        prodBootErrorLogged = true;
      }
      savedConsoleError29(...args);
    };

    await bootRegister();
    assert(prodBootErrorLogged, "Boot check enforces required environment variables in production mode");

    console.error = savedConsoleError29;
    (process.env as any).NODE_ENV = savedNodeEnv;
    if (savedAdminEmail) process.env.ADMIN_EMAIL = savedAdminEmail;
    if (savedSentryDsn) process.env.SENTRY_DSN = savedSentryDsn;
    if (savedUpstashUrl) process.env.UPSTASH_REDIS_REST_URL = savedUpstashUrl;
    if (savedUpstashToken) process.env.UPSTASH_REDIS_REST_TOKEN = savedUpstashToken;

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
