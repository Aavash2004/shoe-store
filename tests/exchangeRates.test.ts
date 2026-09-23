import assert from "node:assert";
import { prisma } from "../lib/db/prisma";
import {
  OpenErApiResponseSchema,
  getExchangeRates,
  getStaticBaselineRates,
  clearExchangeRateMemoryCache,
  syncExchangeRates,
  SYNCED_CURRENCIES,
} from "../lib/services/exchangeRates";

async function runExchangeRateTests() {
  console.log("==================================================");
  console.log("Starting Exchange Rate & Forex Engine Test Suite");
  console.log("==================================================\n");

  // ----------------------------------------------------
  // Test 1: Zod Validation Strictness
  // ----------------------------------------------------
  console.log("--- 1. Open ER API Zod Contract Validation ---");
  const validPayload = {
    result: "success",
    base_code: "USD",
    rates: {
      USD: 1.0,
      NPR: 136.25,
      GBP: 0.775,
      EUR: 0.915,
    },
  };
  const parseSuccess = OpenErApiResponseSchema.safeParse(validPayload);
  assert.strictEqual(parseSuccess.success, true, "Valid Open ER API payload passes schema");

  const validV6Payload = {
    result: "success",
    base_code: "USD",
    conversion_rates: {
      USD: 1.0,
      NPR: 136.25,
      GBP: 0.775,
      EUR: 0.915,
    },
  };
  const parseV6Success = OpenErApiResponseSchema.safeParse(validV6Payload);
  assert.strictEqual(parseV6Success.success, true, "Valid ExchangeRate-API v6 payload passes schema");

  const invalidPayloads = [
    { result: "error", base_code: "USD", rates: {} },
    { result: "success", base_code: "EUR", rates: { USD: 1 } },
    { result: "success", base_code: "USD", rates: { NPR: "not-a-number" } },
    { result: "success" },
  ];

  for (const invalid of invalidPayloads) {
    const parseFail = OpenErApiResponseSchema.safeParse(invalid);
    assert.strictEqual(parseFail.success, false, "Malformed payload safely rejected by Zod schema");
  }
  console.log("✅ PASSED: Zod strictly validates valid responses and rejects malformed/drifted schemas.");

  // ----------------------------------------------------
  // Test 2: Baseline Static Fallback Guarantees
  // ----------------------------------------------------
  console.log("\n--- 2. Static Baseline Peg Fallback ---");
  const baseline = getStaticBaselineRates();
  assert.strictEqual(baseline.USD, 1.0, "USD baseline is 1.0");
  assert.strictEqual(baseline.NPR, 135.0, "NPR baseline matches static 135.0");
  assert.strictEqual(baseline.GBP, 0.78, "GBP baseline matches static 0.78");
  assert.strictEqual(baseline.EUR, 0.92, "EUR baseline matches static 0.92");
  console.log("✅ PASSED: Static baseline pegs match verified reference constants.");

  // ----------------------------------------------------
  // Test 3: Idempotent Concurrent DB Sync
  // ----------------------------------------------------
  console.log("\n--- 3. Concurrent Upsert Idempotency ---");
  clearExchangeRateMemoryCache();

  // Run two sync operations concurrently to test race conditions / unique constraint safety
  const [sync1, sync2] = await Promise.all([
    syncExchangeRates("TEST_SUITE_CONCURRENT_1"),
    syncExchangeRates("TEST_SUITE_CONCURRENT_2"),
  ]);

  console.log(`Sync 1 Result: ${sync1.success ? "Success" : sync1.error}`);
  console.log(`Sync 2 Result: ${sync2.success ? "Success" : sync2.error}`);

  // Both should handle concurrency cleanly without uncaught P2002 error
  assert.strictEqual(typeof sync1.success, "boolean");
  assert.strictEqual(typeof sync2.success, "boolean");

  const dbRows = await prisma.exchangeRate.findMany({
    where: { currency: { in: [...SYNCED_CURRENCIES] } },
  });

  // Verify unique currency rows in database
  const currenciesInDb = dbRows.map((r) => r.currency);
  for (const cur of SYNCED_CURRENCIES) {
    const matches = currenciesInDb.filter((c) => c === cur);
    assert.strictEqual(matches.length, 1, `Exactly 1 row exists in DB for currency ${cur}`);
  }
  console.log("✅ PASSED: Concurrent upserts complete idempotently without duplicate rows.");

  // ----------------------------------------------------
  // Test 4: Zero-Stampede Read & Memory Caching
  // ----------------------------------------------------
  console.log("\n--- 4. Zero-Stampede Read Path & Memory Cache ---");
  clearExchangeRateMemoryCache();

  const ratesFromDb = await getExchangeRates(prisma);
  assert.strictEqual(ratesFromDb.USD, 1.0, "USD is always 1.0");
  assert(ratesFromDb.NPR > 0, "NPR rate is a positive number");
  assert(ratesFromDb.GBP > 0, "GBP rate is a positive number");
  assert(ratesFromDb.EUR > 0, "EUR rate is a positive number");

  // Second read hits in-memory cache
  const ratesFromMemory = await getExchangeRates(prisma);
  assert.deepStrictEqual(ratesFromMemory, ratesFromDb, "Second read returns in-memory cached rates");
  console.log("✅ PASSED: getExchangeRates reads from DB and caches in-memory without external HTTP calls.");

  // ----------------------------------------------------
  // Test 5: 36-Hour Staleness Guard
  // ----------------------------------------------------
  console.log("\n--- 5. 36-Hour Staleness Guard ---");
  clearExchangeRateMemoryCache();

  // Mock a mockDb client with 40-hour-old rates
  const fortyHoursAgo = new Date(Date.now() - 40 * 60 * 60 * 1000);
  const mockStaleDb = {
    exchangeRate: {
      findMany: async () => [
        {
          currency: "NPR",
          rateToBaseUSD: 999.99, // Intentional outlier to prove fallback is used
          updatedAt: fortyHoursAgo,
        },
      ],
    },
    user: {
      findFirst: async () => null,
    },
  };

  const staleResult = await getExchangeRates(mockStaleDb);
  // Stale rate should be discarded in favor of baseline
  assert.strictEqual(
    staleResult.NPR,
    135.0,
    "Stale (>36h) database cache is discarded and falls back to static 135.0"
  );
  console.log("✅ PASSED: 36-hour staleness threshold safely triggers static baseline fallback.");

  console.log("\n==================================================");
  console.log("Forex & Exchange Rate Test Suite Complete: All passed.");
  console.log("==================================================");
}

runExchangeRateTests()
  .catch((err) => {
    console.error("Test Suite Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
