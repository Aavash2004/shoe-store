import {
  publicProductWhere,
  publicCategoryWhere,
  publicVariantWhere,
} from "../lib/visibility";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAILED: ${testName}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
  passedTests++;
  console.log(`✅ PASSED: ${testName}`);
}

console.log("==================================================");
console.log("Starting Visibility & Seasonal Category Test Suite");
console.log("==================================================\n");

// Test 1: publicProductWhere
console.log("--- 1. publicProductWhere ---");
const prodWhere = publicProductWhere();
assert(prodWhere.isActive === true, "Product isActive must be true");
assert(prodWhere.deletedAt === null, "Product deletedAt must be null");
assert(typeof prodWhere.category === "object", "Product must require category condition");
assert((prodWhere.category as any)?.isActive === true, "Product category isActive must be true");

// Test 2: publicCategoryWhere
console.log("\n--- 2. publicCategoryWhere ---");
const catWhere = publicCategoryWhere();
assert(catWhere.isActive === true, "Category isActive must be true");

// Test 3: publicVariantWhere
console.log("\n--- 3. publicVariantWhere ---");
const varWhere = publicVariantWhere();
assert(varWhere.isActive === true, "Variant isActive must be true");
assert(typeof varWhere.product === "object", "Variant must require product condition");
assert((varWhere.product as any)?.isActive === true, "Variant product isActive must be true");
assert((varWhere.product as any)?.deletedAt === null, "Variant product deletedAt must be null");
assert((varWhere.product as any)?.category?.isActive === true, "Variant product category isActive must be true");

console.log("\n==================================================");
console.log(`Visibility Tests completed: ${passedTests}/${totalTests} passed.`);
console.log("==================================================");
