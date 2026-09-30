import { stripe } from "../lib/services/stripe";
import { prisma } from "../lib/db/prisma";

async function main() {
  console.log("==================================================");
  console.log("Testing Stripe Full Checkout & Redirection Pipeline");
  console.log("==================================================");

  // 1. Find an available product variant
  const variant = await prisma.productVariant.findFirst({
    where: { isActive: true, deletedAt: null, stock: { gte: 2 } },
    include: { product: true },
  });

  if (!variant) {
    throw new Error("No active product variant with sufficient stock found.");
  }
  console.log(`[1] Selected Product: ${variant.product.name} (Variant: ${variant.id})`);

  // 2. Call /api/checkout/stripe/create-intent
  const idempotencyKey = `e2e_test_${Date.now()}`;
  console.log(`[2] Calling /api/checkout/stripe/create-intent with Idempotency Key: ${idempotencyKey}...`);

  const createRes = await fetch("http://localhost:3000/api/checkout/stripe/create-intent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      fullName: "Stripe Tester",
      guestEmail: "stripetester@example.com",
      guestName: "Stripe Tester",
      line1: "742 Evergreen Terrace",
      city: "New York",
      state: "NY",
      postalCode: "10001",
      country: "US",
      phone: "+12025550199",
      paymentMethod: "STRIPE",
      idempotencyKey,
      items: [{ variantId: variant.id, quantity: 1 }],
    }),
  });

  const createData = await createRes.json();
  if (!createRes.ok) {
    console.error("Create intent failed:", createData);
    process.exit(1);
  }

  console.log(`✅ Order created successfully: ID=${createData.orderId}, Number=${createData.orderNumber}`);
  console.log(`   Client Secret received: ${createData.clientSecret?.slice(0, 15)}...`);

  // 3. Confirm payment with Stripe API using official test token
  const paymentIntentId = createData.paymentIntentId || createData.clientSecret.split("_secret_")[0];
  console.log(`[3] Confirming Stripe PaymentIntent (${paymentIntentId}) with test card...`);

  const confirmedPI = await stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method: "pm_card_visa",
    return_url: `http://localhost:3000/checkout/success?orderId=${createData.orderId}`,
  });

  console.log(`✅ Stripe PaymentIntent status: ${confirmedPI.status}`);
  if (confirmedPI.status !== "succeeded") {
    throw new Error(`Payment intent not succeeded: status = ${confirmedPI.status}`);
  }

  // 4. Verify /checkout/success route redirection
  console.log(`[4] Verifying /checkout/success?orderId=${createData.orderId} route...`);
  const redirectRes = await fetch(`http://localhost:3000/checkout/success?orderId=${createData.orderId}`, {
    redirect: "manual",
  });

  const redirectLocation = redirectRes.headers.get("location");
  console.log(`   Redirect status: ${redirectRes.status}`);
  console.log(`   Location: ${redirectLocation}`);

  if (redirectRes.status !== 307 && redirectRes.status !== 308) {
    throw new Error(`Expected redirect status (307/308) but got ${redirectRes.status}`);
  }
  if (!redirectLocation?.includes(`/order-confirmation/${createData.orderId}`)) {
    throw new Error(`Expected redirect to /order-confirmation/${createData.orderId}, got ${redirectLocation}`);
  }
  console.log(`✅ Success route properly redirects to: ${redirectLocation}`);

  // 5. Verify /api/orders/[id]/status reconciliation
  console.log(`[5] Verifying /api/orders/${createData.orderId}/status real-time reconciliation...`);
  const statusRes = await fetch(`http://localhost:3000/api/orders/${createData.orderId}/status`);
  const statusData = await statusRes.json();

  console.log(`   Order Payment Status: ${statusData.order?.paymentStatus}`);
  console.log(`   Order Fulfillment Status: ${statusData.order?.status}`);

  if (statusData.order?.paymentStatus !== "PAID") {
    throw new Error(`Expected paymentStatus "PAID", got "${statusData.order?.paymentStatus}"`);
  }
  console.log("✅ Order was automatically reconciled and confirmed as PAID!");

  console.log("==================================================");
  console.log("🎉 ALL TESTS PASSED: Full Stripe payment and redirect verified!");
  console.log("==================================================");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Test failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
