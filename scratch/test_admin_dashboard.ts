import { prisma } from "../lib/db/prisma";

async function main() {
  console.log("Testing Admin Dashboard queries...");

  const [
    totalOrdersCount,
    totalProductsCount,
    lowStockCount,
    recentOrders,
    lowStockItems,
    recentProducts,
    ordersRevenueRows,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.productVariant.count({ where: { stock: { lte: 5 }, isActive: true } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { items: true, user: { select: { name: true, email: true } } },
    }),
    prisma.productVariant.findMany({
      where: { stock: { lte: 5 }, isActive: true },
      take: 12,
      orderBy: { stock: "asc" },
      include: { product: { select: { name: true, slug: true, images: { take: 1 } } } },
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      take: 4,
      orderBy: { createdAt: "desc" },
      include: {
        images: { take: 1 },
        variants: { take: 1 },
        category: { select: { name: true } },
      },
    }),
    prisma.order.findMany({
      where: { status: { not: "CANCELLED" } },
      select: { total: true, currency: true },
    }),
  ]);

  console.log("✅ Admin Dashboard Queries Succeeded!");
  console.log(`- Orders: ${totalOrdersCount}`);
  console.log(`- Products: ${totalProductsCount}`);
  console.log(`- Low Stock Count: ${lowStockCount}`);
  console.log(`- Recent Orders Fetched: ${recentOrders.length}`);
  console.log(`- Low Stock Items Fetched: ${lowStockItems.length}`);
  console.log(`- Recent Products Fetched: ${recentProducts.length}`);
  console.log(`- Revenue Rows Fetched: ${ordersRevenueRows.length}`);
}

main().finally(async () => {
  await prisma.$disconnect();
  process.exit(0);
});
