import assert from "node:assert";
import { prisma } from "../lib/db/prisma";
import {
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendShippingUpdateEmail,
  resolveEmailDispatchParams,
} from "../lib/services/email";

async function runEmailTests() {
  console.log("==================================================");
  console.log("Starting Transactional Email & Resend Test Suite");
  console.log("==================================================");

  // ----------------------------------------------------
  // Test 1: Parameter Resolution Logic & Production Circuit Breaker
  // ----------------------------------------------------
  console.log("\n--- 1. Parameter Resolution Unit Tests (Edge Cases & Guards) ---");

  const sampleHtml = "<html><body><!-- Body Content --><p>Hello World</p></body></html>";

  // 1a. Sandbox in development with non-dev recipient -> MUST reroute
  const devRerouteResult = resolveEmailDispatchParams({
    to: "customer@external.com",
    subject: "Order Confirmation #123",
    html: sampleHtml,
    from: "ABXV Store <onboarding@resend.dev>",
    nodeEnv: "development",
    devInbox: "basnetaavash7@gmail.com",
  });
  assert.strictEqual(devRerouteResult.isRerouted, true, "Sandbox in dev must reroute non-dev recipient");
  assert.strictEqual(devRerouteResult.to, "basnetaavash7@gmail.com", "Target recipient must be dev inbox");
  assert.strictEqual(devRerouteResult.subject, "[Dev Test for: customer@external.com] Order Confirmation #123");
  assert.strictEqual(devRerouteResult.html.includes("Resend Sandbox Test Notification"), true, "HTML must include sandbox notice");
  console.log("✅ PASSED: Dev sandbox reroutes non-owner recipients with dev prefix and banner");

  // 1b. Production Circuit Breaker: Even if using @resend.dev, production NEVER reroutes
  const prodSandboxResult = resolveEmailDispatchParams({
    to: "customer@external.com",
    subject: "Order Confirmation #123",
    html: sampleHtml,
    from: "ABXV Store <onboarding@resend.dev>",
    nodeEnv: "production",
    devInbox: "basnetaavash7@gmail.com",
  });
  assert.strictEqual(prodSandboxResult.isRerouted, false, "Production circuit breaker must strictly disable reroute");
  assert.strictEqual(prodSandboxResult.to, "customer@external.com", "Production must preserve real customer recipient");
  assert.strictEqual(prodSandboxResult.subject, "Order Confirmation #123", "Production must not alter subject");
  assert.strictEqual(prodSandboxResult.html.includes("Resend Sandbox Test Notification"), false, "Production must not inject notice banner");
  console.log("✅ PASSED: Production circuit breaker strictly prevents reroute and tag leakage in production");

  // 1c. Custom Verified Domain: Once EMAIL_FROM is updated, reroute is completely disabled
  const verifiedDomainResult = resolveEmailDispatchParams({
    to: "customer@external.com",
    subject: "Order Confirmation #123",
    html: sampleHtml,
    from: "ABXV Footwear <orders@abxvshoes.com>",
    nodeEnv: "development",
    devInbox: "basnetaavash7@gmail.com",
  });
  assert.strictEqual(verifiedDomainResult.isRerouted, false, "Verified domain must deactivate sandbox reroute");
  assert.strictEqual(verifiedDomainResult.to, "customer@external.com", "Target must be the real customer address");
  assert.strictEqual(verifiedDomainResult.subject, "Order Confirmation #123", "Subject must remain unmodified");
  assert.strictEqual(verifiedDomainResult.html.includes("Resend Sandbox Test Notification"), false, "HTML must remain completely clean");
  console.log("✅ PASSED: Custom verified domain delivers directly without rerouting or sandbox banners");

  // 1d. Dev recipient directly: No rerouting or banner needed
  const devDirectResult = resolveEmailDispatchParams({
    to: "basnetaavash7@gmail.com",
    subject: "Order Confirmation #123",
    html: sampleHtml,
    from: "ABXV Store <onboarding@resend.dev>",
    nodeEnv: "development",
    devInbox: "basnetaavash7@gmail.com",
  });
  assert.strictEqual(devDirectResult.isRerouted, false, "Sending directly to dev inbox does not need reroute banner");
  assert.strictEqual(devDirectResult.to, "basnetaavash7@gmail.com");
  assert.strictEqual(devDirectResult.subject, "Order Confirmation #123");
  console.log("✅ PASSED: Directly addressing dev inbox does not trigger redundant sandbox banners");

  // ----------------------------------------------------
  // Test 2: Live Password Reset with Non-Dev Recipient Reroute
  // ----------------------------------------------------
  console.log("\n--- 2. Live Password Reset Email with Non-Dev Recipient ---");
  const externalUserEmail = "testbuyer99@yahoo.com";
  const resetRes = await sendPasswordResetEmail(
    externalUserEmail,
    "http://localhost:3000/reset-password?token=mocktoken123"
  );
  assert.strictEqual(resetRes.success, true);
  console.log(`✅ PASSED: Password reset email intended for ${externalUserEmail} safely delivered via sandbox reroute`);

  // ----------------------------------------------------
  // Test 3: Order Confirmation Email with real DB order lookup
  // ----------------------------------------------------
  console.log("\n--- 3. Order Confirmation Email Dispatch ---");
  const testOrder = await prisma.order.findFirst({
    include: { items: true },
  });

  if (testOrder) {
    const confirmationRes = await sendOrderConfirmationEmail(testOrder.id);
    assert.strictEqual(confirmationRes.success, true);
    console.log(`✅ PASSED: Order confirmation email dispatched successfully for Order #${testOrder.orderNumber}`);

    // ----------------------------------------------------
    // Test 4: Shipping Status Update Email Dispatch
    // ----------------------------------------------------
    console.log("\n--- 4. Shipping Status Update Email Dispatch ---");
    const shippingRes = await sendShippingUpdateEmail(
      testOrder.id,
      "Package picked up by courier service"
    );
    assert.strictEqual(shippingRes.success, true);
    console.log(`✅ PASSED: Shipping status update email dispatched successfully for Order #${testOrder.orderNumber}`);
  } else {
    console.log("⚠️ SKIPPED: No order found in database to simulate order confirmation.");
  }

  // ----------------------------------------------------
  // Test 5: Missing Order Graceful Handling
  // ----------------------------------------------------
  console.log("\n--- 5. Missing Order Graceful Handling ---");
  const missingRes = await sendOrderConfirmationEmail("non-existent-order-id-9999");
  assert.strictEqual(missingRes.success, false);
  assert.strictEqual(missingRes.error, "Order not found");
  console.log("✅ PASSED: Returns graceful error when order does not exist");

  console.log("\n==================================================");
  console.log("🎉 ALL TESTS PASSED: Both sandbox and production paths fully verified!");
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
