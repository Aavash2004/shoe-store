import { NextRequest } from "next/server";
import { prisma } from "../lib/db/prisma";
import { reserveCouponUsage, releaseCouponUsage } from "../lib/checkout/coupon";
import { calculateOrderPricing } from "../lib/checkout/pricing";
import { releaseOrderStock, decrementStockWithLock } from "../lib/checkout/stock";
import { stripe, toStripeSmallestUnit } from "../lib/services/stripe";
import { toKhaltiPaisa } from "../lib/services/khalti";

// Real route handlers
import { POST as stripeCreateIntentHandler } from "../app/api/checkout/stripe/create-intent/route";
import { POST as khaltiInitiateHandler } from "../app/api/checkout/khalti/initiate/route";
import { GET as khaltiCallbackHandler } from "../app/api/checkout/khalti/callback/route";
import { POST as codCheckoutHandler } from "../app/api/checkout/route";

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

  const createdOrderIds: string[] = [];
  const createdCouponCodes: string[] = [];

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
    assert(Number(usdOrderInDb?.shipping) === 15, "Flat-rate shipping ($15) applied when subtotal < free threshold");
    assert(capturedStripePayload.currency === "usd", "Payload currency sent to Stripe is 'usd'");
    assert(
      capturedStripePayload.amount === Math.round(Number(usdOrderInDb?.total) * 100),
      `Stripe payload amount (${capturedStripePayload.amount} cents) matches stored total (${Math.round(Number(usdOrderInDb?.total) * 100)} cents)`
    );

    // =========================================================================
    // TEST 4: Real Route Handler - Stripe Intent with EUR & Percentage Coupon
    // =========================================================================
    console.log("\n--- TEST 4: Real Route Handler - Stripe Intent (EUR Currency, 20% Percentage Coupon) ---");
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
    assert(oosOrderAfterCallback?.paymentStatus === "REFUNDED", "Order marked as REFUNDED when stock unavailable");

    // Restore variant stock back
    await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: originalStock } });

  } catch (err) {
    console.error("Test execution caught unexpected exception:", err);
    failed++;
  } finally {
    // Restore mocks
    stripe.paymentIntents.create = originalStripeCreate;
    global.fetch = originalFetch;

    // Cleanup test data
    console.log("\nCleaning up test artifacts...");
    if (createdOrderIds.length > 0) {
      await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: createdOrderIds } } });
      await prisma.address.deleteMany({ where: { orders: { some: { id: { in: createdOrderIds } } } } });
      await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    }
    if (createdCouponCodes.length > 0) {
      await prisma.coupon.deleteMany({ where: { code: { in: createdCouponCodes } } });
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
