import {
  canTransition,
  getNextStatuses,
  isTerminalStatus,
  ORDER_TRANSITIONS,
  ORDER_STATUSES,
  type OrderStatus,
} from "../lib/order-status";

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
console.log("Starting Order Status State Machine Test Suite");
console.log("==================================================\n");

// --- 1. Allowed Forward Transitions ---
console.log("--- 1. Allowed Forward Transitions ---");
assert(canTransition("PENDING", "CONFIRMED"), "PENDING -> CONFIRMED is allowed");
assert(canTransition("PENDING", "PROCESSING"), "PENDING -> PROCESSING is allowed");
assert(canTransition("PENDING", "CANCELLED"), "PENDING -> CANCELLED is allowed");

assert(canTransition("CONFIRMED", "PROCESSING"), "CONFIRMED -> PROCESSING is allowed");
assert(canTransition("CONFIRMED", "SHIPPED"), "CONFIRMED -> SHIPPED is allowed");
assert(canTransition("CONFIRMED", "CANCELLED"), "CONFIRMED -> CANCELLED is allowed");

assert(canTransition("PROCESSING", "SHIPPED"), "PROCESSING -> SHIPPED is allowed");
assert(canTransition("PROCESSING", "CANCELLED"), "PROCESSING -> CANCELLED is allowed");

assert(canTransition("SHIPPED", "DELIVERED"), "SHIPPED -> DELIVERED is allowed");

// --- 2. Illegal Rewinds and Disallowed Transitions ---
console.log("\n--- 2. Illegal Rewinds & Forbidden Transitions ---");
assert(!canTransition("SHIPPED", "PENDING"), "SHIPPED -> PENDING is strictly forbidden (no rewinds)");
assert(!canTransition("SHIPPED", "CONFIRMED"), "SHIPPED -> CONFIRMED is strictly forbidden");
assert(!canTransition("SHIPPED", "PROCESSING"), "SHIPPED -> PROCESSING is strictly forbidden");
assert(!canTransition("SHIPPED", "CANCELLED"), "SHIPPED -> CANCELLED is strictly forbidden");

assert(!canTransition("DELIVERED", "PENDING"), "DELIVERED -> PENDING is strictly forbidden");
assert(!canTransition("DELIVERED", "SHIPPED"), "DELIVERED -> SHIPPED is strictly forbidden");
assert(!canTransition("DELIVERED", "CANCELLED"), "DELIVERED -> CANCELLED is strictly forbidden");

assert(!canTransition("CANCELLED", "PENDING"), "CANCELLED -> PENDING is strictly forbidden");
assert(!canTransition("CANCELLED", "CONFIRMED"), "CANCELLED -> CONFIRMED is strictly forbidden");
assert(!canTransition("CANCELLED", "PROCESSING"), "CANCELLED -> PROCESSING is strictly forbidden");

// --- 3. Self-transitions & Unknown Statuses ---
console.log("\n--- 3. Self-transitions & Invalid Inputs ---");
assert(!canTransition("PENDING", "PENDING"), "Self-transition PENDING -> PENDING is rejected");
assert(!canTransition("PROCESSING", "PROCESSING"), "Self-transition PROCESSING -> PROCESSING is rejected");
assert(!canTransition("UNKNOWN" as any, "PROCESSING"), "Unknown source status is rejected");
assert(!canTransition("PENDING", "UNKNOWN" as any), "Unknown target status is rejected");

// --- 4. getNextStatuses helper ---
console.log("\n--- 4. getNextStatuses Helper ---");
const pendingNext = getNextStatuses("PENDING");
assert(
  pendingNext.length === 3 &&
    pendingNext.includes("CONFIRMED") &&
    pendingNext.includes("PROCESSING") &&
    pendingNext.includes("CANCELLED"),
  "getNextStatuses('PENDING') returns [CONFIRMED, PROCESSING, CANCELLED]"
);

const shippedNext = getNextStatuses("SHIPPED");
assert(
  shippedNext.length === 1 && shippedNext[0] === "DELIVERED",
  "getNextStatuses('SHIPPED') returns only [DELIVERED]"
);

const deliveredNext = getNextStatuses("DELIVERED");
assert(
  deliveredNext.length === 0,
  "getNextStatuses('DELIVERED') returns empty array (terminal state)"
);

const cancelledNext = getNextStatuses("CANCELLED");
assert(
  cancelledNext.length === 0,
  "getNextStatuses('CANCELLED') returns empty array (terminal state)"
);

// --- 5. Terminal State Checks ---
console.log("\n--- 5. Terminal State Checks ---");
assert(isTerminalStatus("DELIVERED"), "DELIVERED is terminal");
assert(isTerminalStatus("CANCELLED"), "CANCELLED is terminal");
assert(!isTerminalStatus("PENDING"), "PENDING is not terminal");
assert(!isTerminalStatus("CONFIRMED"), "CONFIRMED is not terminal");
assert(!isTerminalStatus("PROCESSING"), "PROCESSING is not terminal");
assert(!isTerminalStatus("SHIPPED"), "SHIPPED is not terminal");

console.log("\n==================================================");
console.log(`Test Suite Complete: ${passedTests}/${totalTests} tests passed.`);
console.log("==================================================");
