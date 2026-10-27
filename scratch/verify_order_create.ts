import { prisma } from "../lib/db/prisma";

async function main() {
  console.log("Testing prisma.order.create()...");

  // Find an active variant for test
  const variant = await prisma.productVariant.findFirst({
    where: { isActive: true },
    include: { product: true }
  });

  if (!variant) {
    throw new Error("No active product variant found");
  }

  const testOrderNumber = `TEST-${Date.now()}`;
  const order = await prisma.order.create({
    data: {
      orderNumber: testOrderNumber,
      guestEmail: "test@shoestore.com",
      guestName: "Test Customer",
      subtotal: 100,
      total: 100,
      currency: "USD",
      stockReserved: true,
      items: {
        create: [
          {
            variantId: variant.id,
            productName: variant.product.name,
            size: variant.size,
            color: variant.color,
            sku: variant.sku,
            price: 100,
            quantity: 1
          }
        ]
      }
    },
    include: {
      items: true
    }
  });

  console.log("✅ Order created successfully! ID:", order.id, "Number:", order.orderNumber);
  console.log("   stockReserved:", order.stockReserved);
  console.log("   Items count:", order.items.length);

  // Clean up the test order
  await prisma.order.delete({
    where: { id: order.id }
  });
  console.log("✅ Test order cleaned up successfully!");
}

main()
  .catch((e) => {
    console.error("❌ FAILED to create order:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
