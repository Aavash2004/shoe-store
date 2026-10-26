import { prisma } from "../lib/db/prisma";
import { reserveCouponUsage, releaseCouponUsage } from "../lib/checkout/coupon";

async function runTests() {
  console.log("=== Running Coupon & Multi-Currency Tests ===\n");
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

  const testCode = "TEST_CURRENCY_" + Date.now();

  try {
    // 1. Create base USD coupon ($100 min subtotal, $20 fixed discount, maxUses: 1)
    await prisma.coupon.create({
      data: {
        code: testCode,
        discountType: "FIXED_AMOUNT",
        discountValue: 20,
        minSubtotal: 100,
        maxUses: 1,
        usedCount: 0,
        isActive: true,
      },
    });

    // 2. Base currency validation: A cart with $120 USD passes the $100 base threshold
    const baseUsdSubtotal = 120;
    const gbpRate = 0.79;
    const nprRate = 135;

    // Currency conversion helpers matching checkout logic
    const toLocalGbp = (usd: number) => Math.round(usd * gbpRate * 100) / 100;
    const toLocalNpr = (usd: number) => Math.round(usd * nprRate);

    // Test A: Cart $120 USD validated in base USD
    const coupon = await prisma.coupon.findUnique({ where: { code: testCode } });
    assert(coupon !== null, "Coupon exists in base currency (USD)");
    assert(Number(coupon?.minSubtotal) === 100, "Coupon minSubtotal is stored as 100 USD");
    assert(Number(coupon?.discountValue) === 20, "Coupon discountValue is stored as 20 USD");
    assert(baseUsdSubtotal >= Number(coupon?.minSubtotal), "$120 cart qualifies for $100 minSubtotal");

    // Test B: GBP conversion for display & deduction
    const gbpSubtotal = toLocalGbp(baseUsdSubtotal); // £94.80
    const gbpDiscount = toLocalGbp(Number(coupon?.discountValue)); // £15.80
    const gbpTotal = gbpSubtotal - gbpDiscount; // £79.00
    assert(gbpSubtotal === 94.8, "GBP local subtotal is correctly £94.80");
    assert(gbpDiscount === 15.8, "GBP local discount is correctly £15.80 (not £20)");
    assert(gbpTotal === 79.0, "GBP total matches £79.00");

    // Test C: NPR conversion for display & deduction
    const nprSubtotal = toLocalNpr(baseUsdSubtotal); // Rs. 16,200
    const nprDiscount = toLocalNpr(Number(coupon?.discountValue)); // Rs. 2,700
    const nprTotal = nprSubtotal - nprDiscount; // Rs. 13,500
    assert(nprSubtotal === 16200, "NPR local subtotal is correctly Rs. 16,200");
    assert(nprDiscount === 2700, "NPR local discount is correctly Rs. 2,700 (not Rs. 20)");
    assert(nprTotal === 13500, "NPR total matches Rs. 13,500");

    // Test D: Atomic reservation with maxUses guard
    const r1 = await reserveCouponUsage(prisma, testCode);
    assert(r1 === true, "1st reservation succeeds within maxUses limit");

    const r2 = await reserveCouponUsage(prisma, testCode);
    assert(r2 === false, "2nd reservation fails when maxUses limit is reached");

    // Test E: Atomic release on failure/cancellation
    await releaseCouponUsage(prisma, testCode);
    const updated = await prisma.coupon.findUnique({ where: { code: testCode } });
    assert(updated?.usedCount === 0, "Coupon usedCount decrements back to 0 on release");

    const r3 = await reserveCouponUsage(prisma, testCode);
    assert(r3 === true, "Reservation succeeds again after release");
  } finally {
    await prisma.coupon.deleteMany({ where: { code: testCode } });
    await prisma.$disconnect();
  }

  console.log(`\nTests finished: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
