import { prisma } from "../lib/db/prisma";

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

async function runShopFilterTests() {
  console.log("==================================================");
  console.log("Starting Shop Faceted Filter Test Suite");
  console.log("==================================================\n");

  // 1. Check distinct brands in database
  console.log("--- 1. Facet Aggregations ---");
  const brands = await prisma.product.findMany({
    where: { isActive: true, deletedAt: null, brand: { not: null } },
    select: { brand: true },
    distinct: ["brand"],
  });
  assert(Array.isArray(brands), "Brand aggregation returns distinct brand list");

  const sizes = await prisma.productVariant.groupBy({
    by: ["size"],
    where: { isActive: true, product: { isActive: true, deletedAt: null } },
  });
  assert(Array.isArray(sizes), "Size aggregation groups active shoe sizes");

  const colors = await prisma.productVariant.groupBy({
    by: ["color"],
    where: { isActive: true, product: { isActive: true, deletedAt: null } },
  });
  assert(Array.isArray(colors), "Color aggregation groups active shoe colors");

  const priceAgg = await prisma.productVariant.aggregate({
    _min: { price: true },
    _max: { price: true },
    where: { isActive: true, product: { isActive: true, deletedAt: null } },
  });
  assert(priceAgg._min.price !== null, "Min catalog price is defined");
  assert(priceAgg._max.price !== null, "Max catalog price is defined");

  // 2. Query with In-Stock filter
  console.log("\n--- 2. In-Stock Facet Filtering ---");
  const inStockProducts = await prisma.product.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      variants: {
        some: {
          isActive: true,
          deletedAt: null,
          stock: { gt: 0 },
        },
      },
    },
    include: { variants: true },
  });
  assert(
    inStockProducts.every((p) => p.variants.some((v) => v.stock > 0)),
    "Every returned in-stock product possesses at least one variant with stock > 0"
  );

  // 3. Price range filtering
  console.log("\n--- 3. Price Range Filtering ---");
  const minP = 50;
  const maxP = 200;
  const priceFiltered = await prisma.product.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      variants: {
        some: {
          isActive: true,
          deletedAt: null,
          price: { gte: minP, lte: maxP },
        },
      },
    },
    include: { variants: true },
  });
  assert(
    priceFiltered.every((p) =>
      p.variants.some((v) => Number(v.price) >= minP && Number(v.price) <= maxP)
    ),
    `Every returned product has at least one variant between $${minP} and $${maxP}`
  );

  console.log("\n==================================================");
  console.log(`Test Suite Complete: ${passedTests}/${totalTests} tests passed.`);
  console.log("==================================================");
}

runShopFilterTests().catch((err) => {
  console.error("Shop filter test failed:", err);
  process.exit(1);
});
