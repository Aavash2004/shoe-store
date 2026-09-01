import { prisma } from "../lib/db/prisma";

async function main() {
  console.log("Testing dashboard queries individually...");

  try {
    const ordersCount = await prisma.order.count();
    console.log("Orders count:", ordersCount);
  } catch (e) {
    console.error("Order count failed:", e);
  }

  try {
    const productsCount = await prisma.product.count();
    console.log("Products count:", productsCount);
  } catch (e) {
    console.error("Product count failed:", e);
  }

  try {
    const lowStockCount = await prisma.productVariant.count({
      where: { stock: { lte: 5 }, isActive: true },
    });
    console.log("Low stock count:", lowStockCount);
  } catch (e) {
    console.error("Low stock count failed:", e);
  }

  try {
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { items: true, user: { select: { name: true, email: true } } },
    });
    console.log("Recent orders count:", recentOrders.length);
  } catch (e) {
    console.error("Recent orders failed:", e);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => process.exit(0));
