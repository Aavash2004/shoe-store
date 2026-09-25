import assert from "node:assert";
import { prisma } from "../lib/db/prisma";

async function runNotificationTests() {
  console.log("==================================================");
  console.log("Starting In-App Notification Center Test Suite");
  console.log("==================================================");

  // 1. Test Default / Guest fallback announcement
  console.log("\n--- 1. Default Store Announcement Query ---");
  const defaultRes = await fetch("http://localhost:3000/api/notifications");
  assert.strictEqual(defaultRes.status, 200, "Notifications API returns 200 OK");
  const defaultData = await defaultRes.json();
  assert(Array.isArray(defaultData.notifications), "Returns notifications array");
  console.log(`✅ PASSED: Default query returned ${defaultData.notifications.length} notification(s)`);

  // 2. Query with real order ID
  console.log("\n--- 2. Order Milestone Notification Query ---");
  const testOrder = await prisma.order.findFirst({
    where: { paymentStatus: "PAID" },
    include: { items: true, statusHistory: true },
    orderBy: { createdAt: "desc" },
  });

  if (testOrder) {
    const orderRes = await fetch(`http://localhost:3000/api/notifications?orderIds=${testOrder.id}`);
    assert.strictEqual(orderRes.status, 200);
    const orderData = await orderRes.json();
    assert(orderData.notifications.length > 0, "Returns milestone notifications for order");

    const placedNotif = orderData.notifications.find((n: any) => n.type === "ORDER_PLACED");
    const paidNotif = orderData.notifications.find((n: any) => n.type === "PAYMENT_SUCCESS");

    assert(placedNotif, "Includes ORDER_PLACED notification");
    assert(placedNotif.orderNumber === testOrder.orderNumber, "Matches order number");
    assert(paidNotif, "Includes PAYMENT_SUCCESS notification for paid order");

    console.log(`✅ PASSED: Found ${orderData.notifications.length} notifications for Order #${testOrder.orderNumber}`);
    console.log(`   - ${placedNotif.title}: "${placedNotif.message}"`);
    console.log(`   - ${paidNotif.title}: "${paidNotif.message}"`);
  } else {
    console.log("⚠️ SKIPPED: No paid order in DB to test milestone mapping.");
  }

  // 3. Structure and Schema Validation
  console.log("\n--- 3. Notification Schema Integrity ---");
  const sampleNotif = defaultData.notifications[0];
  assert(typeof sampleNotif.id === "string", "ID must be a string");
  assert(typeof sampleNotif.title === "string", "Title must be a string");
  assert(typeof sampleNotif.message === "string", "Message must be a string");
  assert(typeof sampleNotif.createdAt === "string", "CreatedAt must be an ISO string");
  assert(typeof sampleNotif.link === "string", "Link must be a string");
  console.log("✅ PASSED: All required notification attributes present and typed");

  console.log("\n==================================================");
  console.log("🎉 ALL TESTS PASSED: Notification Center verified!");
  console.log("==================================================");

  await prisma.$disconnect();
}

runNotificationTests().catch(async (e) => {
  console.error("Test Suite Failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
