import { prisma } from "../lib/db/prisma";
import { GET as trackOrderRoute } from "../app/api/orders/track/route";
import { GET as orderStatusRoute } from "../app/api/orders/[id]/status/route";
import { cancelCustomerOrder } from "../app/account/orders/[id]/actions";
import { NextRequest } from "next/server";

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

async function runTests() {
  console.log("==================================================");
  console.log("Starting Order Tracking & History Test Suite");
  console.log("==================================================\n");

  const testSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const testOrderNumber = `TEST-ORD-${testSuffix}`;
  const testGuestEmail = `customer-${testSuffix.toLowerCase()}@shoes.test`;
  let createdOrderId: string | null = null;
  let testVariantId: string | null = null;

  try {
    // ----------------------------------------------------
    // Setup: Retrieve an active product variant for items
    // ----------------------------------------------------
    const variant = await prisma.productVariant.findFirst({
      where: {
        isActive: true,
        deletedAt: null,
        stock: { gte: 1 },
      },
      include: { product: true },
    });

    if (!variant) {
      throw new Error("No active product variant available for testing.");
    }
    testVariantId = variant.id;

    // Create a mock order in database
    const order = await prisma.order.create({
      data: {
        orderNumber: testOrderNumber,
        guestEmail: testGuestEmail,
        guestName: "Test Shoe Buyer",
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "COD",
        currency: "USD",
        subtotal: 120.0,
        shipping: 15.0,
        tax: 0.0,
        discount: 0.0,
        total: 135.0,
        items: {
          create: {
            variantId: variant.id,
            productName: variant.product.name,
            size: variant.size,
            color: variant.color,
            sku: `${variant.sku}-TEST-${testSuffix}`,
            price: 120.0,
            quantity: 1,
          },
        },
        statusHistory: {
          create: [
            {
              status: "PENDING",
              note: "Order created for tracking test suite",
            },
          ],
        },
      },
    });

    createdOrderId = order.id;

    // ----------------------------------------------------
    // Test 1: Order Status API includes email & items
    // ----------------------------------------------------
    console.log("--- 1. Order Status API Query ---");
    const statusReq = new NextRequest(`http://localhost:3000/api/orders/${order.id}/status`);
    const statusRes = await orderStatusRoute(statusReq, {
      params: Promise.resolve({ id: order.id }),
    });

    assert(statusRes.status === 200, "Order status API returns 200 OK");
    const statusData = await statusRes.json();
    assert(statusData.order.orderNumber === testOrderNumber, "Order status returns correct orderNumber");
    assert(statusData.order.email === testGuestEmail, "Order status returns customer email for tracking pre-fill");
    assert(typeof statusData.order.total === "number", "Order status total is serialized as number");
    assert(statusData.order.items.length === 1, "Order status returns itemized shoe line items");

    // ----------------------------------------------------
    // Test 2: Public Guest Tracking with Exact Email
    // ----------------------------------------------------
    console.log("\n--- 2. Public Tracking API ---");
    const trackReq = new NextRequest(
      `http://localhost:3000/api/orders/track?orderNumber=${testOrderNumber}&email=${testGuestEmail}`
    );
    const trackRes = await trackOrderRoute(trackReq);
    assert(trackRes.status === 200, "Track order API returns 200 OK with valid credentials");
    const trackData = await trackRes.json();
    assert(trackData.order.orderNumber === testOrderNumber, "Track response matches order number");
    assert(trackData.order.status === "PENDING", "Initial status is PENDING");
    assert(Array.isArray(trackData.order.statusHistory), "Includes statusHistory array for timeline");

    // ----------------------------------------------------
    // Test 3: Case-Insensitive Order Number & Email Matching
    // ----------------------------------------------------
    console.log("\n--- 3. Case-Insensitive Tracking Matching ---");
    const lowerOrderNum = testOrderNumber.toLowerCase();
    const upperEmail = testGuestEmail.toUpperCase();
    const caseReq = new NextRequest(
      `http://localhost:3000/api/orders/track?orderNumber=${lowerOrderNum}&email=${upperEmail}`
    );
    const caseRes = await trackOrderRoute(caseReq);
    assert(caseRes.status === 200, "Track order accepts lowercase orderNumber and uppercase email");
    const caseData = await caseRes.json();
    assert(caseData.order.orderNumber === testOrderNumber, "Normalized query returns exact order");

    // ----------------------------------------------------
    // Test 4: Privacy Protection on Mismatched Email
    // ----------------------------------------------------
    console.log("\n--- 4. Privacy & Email Mismatch Protection ---");
    const mismatchReq = new NextRequest(
      `http://localhost:3000/api/orders/track?orderNumber=${testOrderNumber}&email=imposter@wrong.test`
    );
    const mismatchRes = await trackOrderRoute(mismatchReq);
    assert(mismatchRes.status === 404, "Returns 404 when email does not match order record");
    const mismatchData = await mismatchRes.json();
    assert(mismatchData.error.includes("Email address does not match"), "Returns descriptive mismatch message");

    // ----------------------------------------------------
    // Test 5: Missing Required Query Parameters
    // ----------------------------------------------------
    console.log("\n--- 5. Parameter Validation ---");
    const noEmailReq = new NextRequest(
      `http://localhost:3000/api/orders/track?orderNumber=${testOrderNumber}`
    );
    const noEmailRes = await trackOrderRoute(noEmailReq);
    assert(noEmailRes.status === 400, "Returns 400 when email is omitted for guest lookup");

    const noNumReq = new NextRequest(
      `http://localhost:3000/api/orders/track?email=${testGuestEmail}`
    );
    const noNumRes = await trackOrderRoute(noNumReq);
    assert(noNumRes.status === 400, "Returns 400 when orderNumber is omitted");

    // ----------------------------------------------------
    // Test 6: Fulfillment Status Progression
    // ----------------------------------------------------
    console.log("\n--- 6. Status History Progression ---");
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PROCESSING",
        statusHistory: {
          create: {
            status: "PROCESSING",
            note: "Shoes packed and inspected at fulfillment warehouse",
          },
        },
      },
    });

    const procReq = new NextRequest(
      `http://localhost:3000/api/orders/track?orderNumber=${testOrderNumber}&email=${testGuestEmail}`
    );
    const procRes = await trackOrderRoute(procReq);
    const procData = await procRes.json();
    assert(procData.order.status === "PROCESSING", "Order reflects updated PROCESSING status");
    assert(procData.order.statusHistory.length === 2, "Status history log records both milestone events");

  } finally {
    // ----------------------------------------------------
    // Cleanup: Remove test order and associated items
    // ----------------------------------------------------
    console.log("\n--- Cleaning up test artifacts ---");
    if (createdOrderId) {
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: createdOrderId } });
      await prisma.orderItem.deleteMany({ where: { orderId: createdOrderId } });
      await prisma.order.deleteMany({ where: { id: createdOrderId } });
    }
    console.log("Cleanup completed.");
  }

  console.log("\n==================================================");
  console.log(`Test Suite Complete: ${passedTests}/${totalTests} tests passed.`);
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
