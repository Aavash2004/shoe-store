import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import {
  AdminDashboardClient,
  type AdminDashboardOrder,
  type AdminDashboardProduct,
  type AdminDashboardLowStock,
} from "@/components/admin/AdminDashboardClient";

export const dynamic = "force-dynamic";

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (firstErr) {
    console.warn("[Dashboard Query Warning] Retrying in 200ms...", firstErr);
    try {
      await new Promise((r) => setTimeout(r, 200));
      return await fn();
    } catch (secondErr) {
      console.error("[Dashboard Query Failed] Using fallback:", secondErr);
      return fallback;
    }
  }
}

async function executeAdminDashboardData() {
  const [
    totalOrdersCount,
    totalProductsCount,
    lowStockCount,
    recentOrders,
    lowStockItems,
    recentProducts,
    ordersRevenueRows,
  ] = await Promise.all([
    safeQuery(() => prisma.order.count(), 0),
    safeQuery(() => prisma.product.count({ where: { deletedAt: null } }), 0),
    safeQuery(
      () =>
        prisma.productVariant.count({
          where: { stock: { lte: 5 }, isActive: true },
        }),
      0
    ),
    safeQuery(
      () =>
        prisma.order.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { items: true, user: { select: { name: true, email: true } } },
        }),
      []
    ),
    safeQuery(
      () =>
        prisma.productVariant.findMany({
          where: { stock: { lte: 5 }, isActive: true },
          take: 4,
          include: { product: { select: { name: true, slug: true, images: { take: 1 } } } },
        }),
      []
    ),
    safeQuery(
      () =>
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
      []
    ),
    // Fetch all completed/non-cancelled order totals along with their native currency
    safeQuery(
      () =>
        prisma.order.findMany({
          where: { status: { not: "CANCELLED" } },
          select: { total: true, currency: true },
        }),
      []
    ),
  ]);

  const serializedRevenueOrders = ordersRevenueRows.map((r) => ({
    total: Number(r.total),
    currency: r.currency || "USD",
  }));

  const serializedRecentOrders: AdminDashboardOrder[] = recentOrders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    total: Number(o.total),
    currency: o.currency || "USD",
    status: o.status,
    itemsCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
    customerName: o.user?.name || o.user?.email || "Guest",
  }));

  const serializedRecentProducts: AdminDashboardProduct[] = recentProducts.map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: p.createdAt.toISOString(),
    categoryName: p.category?.name ?? "Footwear",
    price: p.variants[0]?.price ? Number(p.variants[0].price) : 0,
    imageUrl: p.images[0]?.url || "/images/Shoes/gmm.jpeg",
  }));

  const serializedLowStock: AdminDashboardLowStock[] = lowStockItems.map((item) => ({
    id: item.id,
    name: item.product.name,
    size: item.size,
    color: item.color,
    stock: item.stock,
    imageUrl: item.product.images?.[0]?.url || "/images/Shoes/gmm.jpeg",
  }));

  return {
    totalOrdersCount,
    totalProductsCount,
    lowStockCount,
    serializedRevenueOrders,
    serializedRecentOrders,
    serializedRecentProducts,
    serializedLowStock,
  };
}

export default async function AdminDashboardPage() {
  const session = await auth();
  const adminName = session?.user?.name || session?.user?.email?.split("@")[0] || "Admin";

  const {
    totalOrdersCount,
    totalProductsCount,
    lowStockCount,
    serializedRevenueOrders,
    serializedRecentOrders,
    serializedRecentProducts,
    serializedLowStock,
  } = await executeAdminDashboardData();

  return (
    <AdminDashboardClient
      adminName={adminName}
      totalOrdersCount={totalOrdersCount}
      totalProductsCount={totalProductsCount}
      lowStockCount={lowStockCount}
      revenueOrders={serializedRevenueOrders}
      recentOrders={serializedRecentOrders}
      recentProducts={serializedRecentProducts}
      lowStockItems={serializedLowStock}
    />
  );
}