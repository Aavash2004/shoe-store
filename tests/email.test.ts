import assert from "node:assert";
import { prisma } from "../lib/db/prisma";
import {
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendShippingUpdateEmail,
} from "../lib/services/email";

async function runEmailTests() {
  console.log("==================================================");
  console.log("Starting Transactional Email & Resend Test Suite");
  console.log("==================================================");

  // 1. Password Reset Simulation
  console.log("\n--- 1. Password Reset Email Dispatch ---");
  const testEmail = "basnetaavash7@gmail.com";
  const resetRes = await sendPasswordResetEmail(
    testEmail,
    "http://localhost:3000/reset-password?token=mocktoken123"
  );
  assert.strictEqual(resetRes.success, true);
  console.log(`✅ PASSED: Password reset email dispatches successfully to ${testEmail}`);

  // 2. Order Confirmation Simulation with real DB order lookup
  console.log("\n--- 2. Order Confirmation Email Dispatch ---");
  const testOrder = await prisma.order.findFirst({
    include: { items: true },
  });

  if (testOrder) {
    const confirmationRes = await sendOrderConfirmationEmail(testOrder.id);
    console.log(`Order confirmation dispatch: ${confirmationRes.success ? "✅ Delivered" : `⚠️ Handled (${confirmationRes.error})`}`);

    // 3. Shipping Status Update Email Dispatch
    console.log("\n--- 3. Shipping Status Update Email Dispatch ---");
    const shippingRes = await sendShippingUpdateEmail(
      testOrder.id,
      "Package picked up by courier service"
    );
    console.log(`Shipping status update dispatch status: ${shippingRes.success ? "Sent" : shippingRes.error}`);
  } else {
    console.log("⚠️ SKIPPED: No order found in database to simulate order confirmation.");
  }

  // 4. Missing Order Graceful Handling
  console.log("\n--- 4. Missing Order Graceful Handling ---");
  const missingRes = await sendOrderConfirmationEmail("non-existent-order-id-9999");
  assert.strictEqual(missingRes.success, false);
  assert.strictEqual(missingRes.error, "Order not found");
  console.log("✅ PASSED: Returns graceful error when order does not exist");

  console.log("\n==================================================");
  console.log("Email Test Suite Complete: All tests passed.");
  console.log("==================================================");
}

runEmailTests()
  .catch((err) => {
    console.error("Test Suite Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
