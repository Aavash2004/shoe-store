import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { ArrowRight, Plus, ShoppingBag, Boxes, Tag, Users } from "lucide-react";

export const dynamic = "force-dynamic";

function statusDot(status: string) {
  const colors: Record<string, string> = {
    DELIVERED: "bg-emerald-500",
    SHIPPED: "bg-[var(--color-sky)]",
    PROCESSING: "bg-amber-500",
    PENDING: "bg-[var(--color-navy)]/30",
    CANCELLED: "bg-rose-500",
  };
  return colors[status] ?? "bg-[var(--color-navy)]/30";
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    DELIVERED: "Delivered",
    SHIPPED: "Shipped",
    PROCESSING: "Processing",
    PENDING: "Pending",
    CANCELLED: "Cancelled",
  };
  return map[status] ?? status;
}

function timeAgo(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

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
    revenueAggregate,
  ] = await Promise.all([
    safeQuery(() => prisma.order.count(), 0),
    safeQuery(() => prisma.product.count({ where: { deletedAt: null } }), 0),
    safeQuery(() => prisma.productVariant.count({ where: { stock: { lte: 5 }, isActive: true } }), 0),
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
    safeQuery(() => prisma.order.aggregate({ _sum: { total: true } }), { _sum: { total: null } }),
  ]);

  return [
    totalOrdersCount,
    totalProductsCount,
    lowStockCount,
    recentOrders,
    lowStockItems,
    recentProducts,
    revenueAggregate,
  ] as const;
}

export default async function AdminDashboardPage() {
  const session = await auth();
  const adminName = session?.user?.name || session?.user?.email?.split("@")[0] || "Admin";

  const [
    totalOrdersCount,
    totalProductsCount,
    lowStockCount,
    recentOrders,
    lowStockItems,
    recentProducts,
    revenueAggregate,
  ] = await executeAdminDashboardData();

  const totalRevenue = Number(revenueAggregate._sum.total || 0);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-navy)]/55">
          Overview
        </span>
        <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-navy)]">
          Welcome back, {adminName}
        </h1>
        <p className="mt-1 text-xs text-[var(--color-navy)]/60">
          Here&apos;s what&apos;s happening with your store today.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-6 divide-x divide-[var(--color-sand)] border-y border-[var(--color-sand)] py-6 sm:grid-cols-4">
        <div className="pl-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/50">Orders</p>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-navy)]">{totalOrdersCount}</p>
          <p className="mt-0.5 text-[10px] font-medium text-[var(--color-navy)]/45">All time orders</p>
        </div>
        <div className="pl-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/50">Revenue</p>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-navy)]">
            ${totalRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-[var(--color-navy)]/45">All time revenue</p>
        </div>
        <div className="pl-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/50">Products</p>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-navy)]">{totalProductsCount}</p>
          <p className="mt-0.5 text-[10px] font-medium text-[var(--color-navy)]/45">Active products</p>
        </div>
        <div className="pl-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/50">Low Stock</p>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-navy)]">{lowStockCount}</p>
          <p className="mt-0.5 text-[10px] font-medium text-[var(--color-navy)]/45">Variants to restock</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-10 lg:col-span-2">
          {/* Recent Orders */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">Recent Orders</h2>
              <Link href="/admin/orders" className="flex items-center gap-1 text-xs font-semibold text-[var(--color-navy)] hover:text-[var(--color-sky)] transition-colors">
                View all orders <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <p className="mt-6 text-xs text-[var(--color-navy)]/50">No orders yet.</p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-sand)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
                      <th className="px-5 py-3 font-bold">Order</th>
                      <th className="px-5 py-3 font-bold">Customer</th>
                      <th className="px-5 py-3 text-center font-bold">Items</th>
                      <th className="px-5 py-3 text-right font-bold">Total</th>
                      <th className="px-5 py-3 text-right font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-sand)]/70">
                    {recentOrders.map((order: any) => {
                      const totalQty = order.items.reduce(
                        (sum: number, i: any) => sum + i.quantity,
                        0
                      );
                      const customerName = order.user?.name || order.user?.email || "Guest";
                      return (
                        <tr key={order.id} className="hover:bg-[var(--color-sand)]/20 transition-colors">
                          <td className="px-5 py-3.5">
                            <Link href={`/admin/orders/${order.id}`} className="font-mono font-bold text-[var(--color-navy)] hover:underline">
                              #{order.orderNumber}
                            </Link>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-medium text-[var(--color-navy)]/80">
                            {customerName}
                          </td>
                          <td className="px-5 py-3.5 text-center text-xs text-[var(--color-navy)]/70">{totalQty}</td>
                          <td className="px-5 py-3.5 text-right font-bold text-[var(--color-navy)]">
                            ${Number(order.total).toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-navy)]/70">
                              <span className={`h-2 w-2 rounded-full ${statusDot(order.status)}`} />
                              {statusLabel(order.status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recently added products */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">Recently Added Products</h2>
              <Link href="/admin/products" className="flex items-center gap-1 text-xs font-semibold text-[var(--color-navy)] hover:text-[var(--color-sky)] transition-colors">
                All products <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentProducts.length === 0 ? (
              <p className="mt-6 text-xs text-[var(--color-navy)]/50">No products yet.</p>
            ) : (
              <div className="mt-4 flex flex-col divide-y divide-[var(--color-sand)] rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] overflow-hidden">
                {recentProducts.map((prod: any) => {
                  const imgUrl = prod.images[0]?.url || "/images/Shoes/gmm.jpeg";
                  const price = prod.variants[0]?.price ? Number(prod.variants[0].price) : 0;
                  return (
                    <div key={prod.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--color-sand)]/20 transition-colors">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--color-cream)] border border-[var(--color-sand)]">
                        <Image src={imgUrl} alt={prod.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--color-navy)] truncate">{prod.name}</p>
                        <p className="text-xs text-[var(--color-navy)]/50">{prod.category?.name ?? "Footwear"}</p>
                      </div>
                      <p className="text-sm font-bold text-[var(--color-navy)]">${price.toFixed(2)}</p>
                      <p className="w-20 text-right text-xs text-[var(--color-navy)]/50">{timeAgo(prod.createdAt)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-10">
          {/* Low stock */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">Low Stock Alerts</h2>
              <Link href="/admin/inventory" className="flex items-center gap-1 text-xs font-semibold text-[var(--color-navy)] hover:text-[var(--color-sky)] transition-colors">
                View inventory <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {lowStockItems.length === 0 ? (
              <p className="mt-6 text-xs text-[var(--color-navy)]/50">All inventory levels healthy.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-2.5">
                {lowStockItems.map((item: any) => {
                  const imgUrl = item.product.images?.[0]?.url || "/images/Shoes/gmm.jpeg";
                  const urgent = item.stock <= 2;
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]">
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[var(--color-cream)] border border-[var(--color-sand)]">
                        <Image src={imgUrl} alt={item.product.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--color-navy)] truncate">{item.product.name}</p>
                        <p className="text-[10px] text-[var(--color-navy)]/50">Size {item.size} · {item.color}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-bold ${urgent ? "text-rose-600" : "text-amber-600"}`}>
                          {item.stock} left
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">Quick Actions</h2>
            <div className="mt-4 flex flex-col gap-2.5">
              <Link
                href="/admin/products/new"
                className="flex items-center gap-2 rounded-xl bg-[var(--color-navy)] px-4 py-3 text-xs font-semibold text-[var(--color-cream)] hover:bg-[var(--color-navy)]/90 transition-colors shadow-2xs"
              >
                <Plus className="h-4 w-4" /> Add New Product
              </Link>
              <Link
                href="/admin/orders"
                className="flex items-center justify-between rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] px-4 py-2.5 text-xs font-semibold text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 transition-colors"
              >
                <span className="flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-[var(--color-navy)]/50" /> View Orders</span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--color-navy)]/40" />
              </Link>
              <Link
                href="/admin/inventory"
                className="flex items-center justify-between rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] px-4 py-2.5 text-xs font-semibold text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 transition-colors"
              >
                <span className="flex items-center gap-2"><Boxes className="h-4 w-4 text-[var(--color-navy)]/50" /> Manage Inventory</span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--color-navy)]/40" />
              </Link>
              <Link
                href="/admin/categories"
                className="flex items-center justify-between rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] px-4 py-2.5 text-xs font-semibold text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 transition-colors"
              >
                <span className="flex items-center gap-2"><Tag className="h-4 w-4 text-[var(--color-navy)]/50" /> Manage Categories</span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--color-navy)]/40" />
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center justify-between rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] px-4 py-2.5 text-xs font-semibold text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 transition-colors"
              >
                <span className="flex items-center gap-2"><Users className="h-4 w-4 text-[var(--color-navy)]/50" /> Manage Users</span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--color-navy)]/40" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}