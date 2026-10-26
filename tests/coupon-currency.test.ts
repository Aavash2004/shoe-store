import { prisma } from "../lib/db/prisma";
import { reserveCouponUsage, releaseCouponUsage } from "../lib/checkout/coupon";
import { calculateOrderPricing } from "../lib/checkout/pricing";
import { releaseOrderStock } from "../lib/checkout/stock";
import { toStripeSmallestUnit } from "../lib/services/stripe";
import { toKhaltiPaisa } from "../lib/services/khalti";

async function runTests() {
  console.log("=== Running Extended Coupon, Currency & Concurrency Test Suite ===\n");
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

  // Find an active product variant that satisfies checkout criteria
  const variant = await prisma.productVariant.findFirst({
    where: {
      isActive: true,
      deletedAt: null,
      stock: { gte: 10 },
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
    throw new Error("No active product variant found with sufficient stock for testing.");
  }

  const testCodeConcurrency = "CONCURRENCY_" + Date.now();
  const testCodeE2E = "E2E_COUPON_" + Date.now();

  try {
    // =========================================================================
    // TEST 1: Concurrency Guard (maxUses = 1, 10 parallel reservations)
    // =========================================================================
    console.log("\n--- TEST 1: 10 Parallel Reservations (maxUses = 1) ---");
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
    assert(successCount === 1, "Exactly 1 reservation succeeded out of 10 parallel requests");
    assert(failCount === 9, "Exactly 9 reservations failed out of 10 parallel requests");

    const couponStateAfterParallel = await prisma.coupon.findUnique({
      where: { code: testCodeConcurrency },
    });
    assert(couponStateAfterParallel?.usedCount === 1, "Database usedCount is strictly 1");

    // =========================================================================
    // TEST 2: End-to-End Real Order Pricing & Gateway Parity (GBP & NPR)
    // =========================================================================
    console.log("\n--- TEST 2: End-to-End Real Order Pricing & Gateway Parity ---");
    // Create fixed coupon ($20 discount, $50 min subtotal)
    await prisma.coupon.create({
      data: {
        code: testCodeE2E,
        discountType: "FIXED_AMOUNT",
        discountValue: 20,
        minSubtotal: 50,
        maxUses: 10,
        usedCount: 0,
        isActive: true,
      },
    });

    // 2a. Real GBP Order
    const gbpPricing = await calculateOrderPricing(
      [{ variantId: variant.id, quantity: 2 }],
      "GB",
      testCodeE2E,
      prisma
    );

    // Client-side display calculation matching checkout/page.tsx:
    // unit price is converted to local currency first, then multiplied by quantity
    const itemUsd = Number(variant.price);
    const gbpRate = gbpPricing.exchangeRate;
    const unitGbp = Math.round(itemUsd * gbpRate * 100) / 100;
    const clientGbpSubtotal = unitGbp * 2;
    const clientGbpDiscount = Math.round(20 * gbpRate * 100) / 100;
    const clientGbpTotal = Math.round(Math.max(0, clientGbpSubtotal + gbpPricing.shipping - clientGbpDiscount) * 100) / 100;

    // Create real GBP order in DB
    const gbpOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-GBP-${Date.now()}`,
        currency: "GBP",
        exchangeRate: gbpPricing.exchangeRate,
        subtotal: gbpPricing.subtotal,
        shipping: gbpPricing.shipping,
        discount: gbpPricing.discount,
        total: gbpPricing.total,
        couponCode: testCodeE2E,
        paymentMethod: "STRIPE",
        paymentStatus: "PENDING",
        status: "PENDING",
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku,
              price: gbpPricing.orderItems[0].price,
              quantity: 2,
            },
          ],
        },
      },
    });

    const amountSentToStripe = toStripeSmallestUnit(Number(gbpOrder.total), "GBP");
    const expectedStripeAmount = Math.round(clientGbpTotal * 100);

    assert(
      Number(gbpOrder.total) === clientGbpTotal,
      `GBP: Displayed Total (£${clientGbpTotal}) == Stored Order Total (£${Number(gbpOrder.total)})`
    );
    assert(
      amountSentToStripe === expectedStripeAmount,
      `GBP: Amount Sent to Stripe (${amountSentToStripe}p) == Expected (${expectedStripeAmount}p)`
    );

    // 2b. Real NPR Order
    const nprPricing = await calculateOrderPricing(
      [{ variantId: variant.id, quantity: 2 }],
      "NP",
      testCodeE2E,
      prisma
    );

    const nprRate = nprPricing.exchangeRate;
    const unitNpr = Math.round(itemUsd * nprRate);
    const clientNprSubtotal = unitNpr * 2;
    const clientNprDiscount = Math.round(20 * nprRate);
    const clientNprTotal = Math.max(0, clientNprSubtotal + nprPricing.shipping - clientNprDiscount);

    const nprOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-NPR-${Date.now()}`,
        currency: "NPR",
        exchangeRate: nprPricing.exchangeRate,
        subtotal: nprPricing.subtotal,
        shipping: nprPricing.shipping,
        discount: nprPricing.discount,
        total: nprPricing.total,
        couponCode: testCodeE2E,
        paymentMethod: "KHALTI",
        paymentStatus: "PENDING",
        status: "PENDING",
        items: {
          create: [
            {
              variantId: variant.id,
              productName: variant.product.name,
              size: variant.size,
              color: variant.color,
              sku: variant.sku,
              price: nprPricing.orderItems[0].price,
              quantity: 2,
            },
          ],
        },
      },
    });

    const amountSentToKhalti = toKhaltiPaisa(Number(nprOrder.total));
    const expectedKhaltiPaisa = Math.round(clientNprTotal * 100);

    assert(
      Number(nprOrder.total) === clientNprTotal,
      `NPR: Displayed Total (Rs. ${clientNprTotal}) == Stored Order Total (Rs. ${Number(nprOrder.total)})`
    );
    assert(
      amountSentToKhalti === expectedKhaltiPaisa,
      `NPR: Amount Sent to Khalti (${amountSentToKhalti} paisa) == Expected (${expectedKhaltiPaisa} paisa)`
    );

    // =========================================================================
    // TEST 3: BUG-006 Single-Use Coupon Lifecycle on Khalti & Cancellation
    // =========================================================================
    console.log("\n--- TEST 3: BUG-006 Khalti Single-Use Coupon Lifecycle ---");
    const testCodeKhalti = "KHALTI_ONCE_" + Date.now();
    await prisma.coupon.create({
      data: {
        code: testCodeKhalti,
        discountType: "FIXED_AMOUNT",
        discountValue: 15,
        minSubtotal: 0,
        maxUses: 1,
        usedCount: 0,
        isActive: true,
      },
    });

    // 1. Initial reservation on Khalti initiation succeeds
    const khaltiReserve1 = await reserveCouponUsage(prisma, testCodeKhalti);
    assert(khaltiReserve1 === true, "Khalti initiation successfully reserves single-use coupon (usedCount = 1)");

    // 2. Second concurrent Khalti initiation with same coupon is rejected
    const khaltiReserve2 = await reserveCouponUsage(prisma, testCodeKhalti);
    assert(khaltiReserve2 === false, "Second concurrent initiation fails with maxUses limit guard");

    // Create order associated with this coupon
    const khaltiOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-KH-${Date.now()}`,
        currency: "NPR",
        subtotal: 5000,
        shipping: 0,
        discount: 2000,
        total: 3000,
        couponCode: testCodeKhalti,
        paymentMethod: "KHALTI",
        paymentStatus: "PENDING",
        status: "PENDING",
      },
    });

    // 3. Order is cancelled (e.g. Khalti expired or user aborted payment)
    const releaseRes = await prisma.$transaction(async (tx) => {
      return await releaseOrderStock(tx, khaltiOrder.id, "Khalti aborted by user");
    });
    assert(releaseRes.success === true, "releaseOrderStock successfully transitioned order to CANCELLED");

    const couponAfterKhaltiCancel = await prisma.coupon.findUnique({ where: { code: testCodeKhalti } });
    assert(couponAfterKhaltiCancel?.usedCount === 0, "Coupon usedCount decremented back to 0 on order cancellation");

    // 4. Repeated cancellation call is strictly idempotent (updateMany count = 0)
    const releaseResDuplicate = await prisma.$transaction(async (tx) => {
      return await releaseOrderStock(tx, khaltiOrder.id, "Duplicate cancel event");
    });
    assert(releaseResDuplicate.success === false, "Duplicate cancel event safely ignored (updateResult.count = 0)");

    const couponAfterDuplicateCancel = await prisma.coupon.findUnique({ where: { code: testCodeKhalti } });
    assert(couponAfterDuplicateCancel?.usedCount === 0, "Coupon usedCount remains 0 and was NOT double-decremented");

    // Clean up created orders
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: [gbpOrder.id, nprOrder.id] } },
    });
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: [gbpOrder.id, nprOrder.id, khaltiOrder.id] } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: [gbpOrder.id, nprOrder.id, khaltiOrder.id] } },
    });
    await prisma.coupon.deleteMany({
      where: { code: { in: [testCodeConcurrency, testCodeE2E, testCodeKhalti] } },
    });
  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
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
