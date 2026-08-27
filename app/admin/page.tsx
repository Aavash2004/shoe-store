import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { ArrowRight, Plus, ShoppingBag, Boxes, Tag, Users } from "lucide-react";

function statusDot(status: string) {
  const colors: Record<string, string> = {
    DELIVERED: "bg-emerald-500",
    SHIPPED: "bg-sky",
    PROCESSING: "bg-amber-500",
    PENDING: "bg-navy/30",
    CANCELLED: "bg-rose-500",
  };
  return colors[status] ?? "bg-navy/30";
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
  ] = await Promise.all([
    prisma.order.count(),
    prisma.product.count(),
    prisma.productVariant.count({ where: { stock: { lte: 5 }, isActive: true } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { items: true, user: { select: { name: true, email: true } } },
    }),
    prisma.productVariant.findMany({
      where: { stock: { lte: 5 }, isActive: true },
      take: 4,
      include: { product: { select: { name: true, slug: true, images: { where: { isPrimary: true }, take: 1 } } } },
    }),
    prisma.product.findMany({
      take: 4,
      orderBy: { createdAt: "desc" },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        variants: { take: 1 },
        category: { select: { name: true } },
      },
    }),
    prisma.order.aggregate({ _sum: { total: true } }),
  ]);

  const totalRevenue = Number(revenueAggregate._sum.total || 0);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-accent">Admin Dashboard</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-5xl text-navy">
          Welcome back, {adminName}
        </h1>
        <p className="mt-2 text-navy/60">Here&apos;s what&apos;s happening with your store today.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-6 divide-x divide-sand border-y border-sand py-6 sm:grid-cols-4">
        <div className="pl-0">
          <p className="text-xs font-medium uppercase tracking-wide text-navy/50">Orders</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl text-navy">{totalOrdersCount}</p>
          <p className="mt-1 text-xs text-navy/45">All time orders</p>
        </div>
        <div className="pl-6">
          <p className="text-xs font-medium uppercase tracking-wide text-navy/50">Revenue</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl text-navy">
            ${totalRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </p>
          <p className="mt-1 text-xs text-navy/45">All time revenue</p>
        </div>
        <div className="pl-6">
          <p className="text-xs font-medium uppercase tracking-wide text-navy/50">Products</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl text-navy">{totalProductsCount}</p>
          <p className="mt-1 text-xs text-navy/45">Active products</p>
        </div>
        <div className="pl-6">
          <p className="text-xs font-medium uppercase tracking-wide text-navy/50">Low Stock</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl text-navy">{lowStockCount}</p>
          <p className="mt-1 text-xs text-navy/45">Variants to restock</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-10 lg:col-span-2">
          {/* Recent Orders */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-navy">Recent Orders</h2>
              <Link href="/admin/orders" className="flex items-center gap-1 text-sm text-accent hover:underline">
                View all orders <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <p className="mt-6 text-sm text-navy/50">No orders yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-sand text-xs uppercase tracking-wide text-navy/45">
                      <th className="pb-2 font-medium">Order</th>
                      <th className="pb-2 font-medium">Customer</th>
                      <th className="pb-2 text-center font-medium">Items</th>
                      <th className="pb-2 text-right font-medium">Total</th>
                      <th className="pb-2 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand">
                   {recentOrders.map((order: (typeof recentOrders)[number]) => {
  const totalQty = order.items.reduce(
    (sum: number, i: (typeof order.items)[number]) => sum + i.quantity,
    0
  );
                      const customerName = order.user?.name || order.user?.email || "Guest";
                      return (
                        <tr key={order.id}>
                          <td className="py-3">
                            <Link href={`/admin/orders/${order.id}`} className="font-medium text-navy hover:underline">
                              #{order.orderNumber}
                            </Link>
                          </td>
                          <td className="py-3">
                            <p className="text-navy">{customerName}</p>
                          </td>
                          <td className="py-3 text-center text-navy/70">{totalQty}</td>
                          <td className="py-3 text-right font-medium text-navy">
                            ${Number(order.total).toFixed(2)}
                          </td>
                          <td className="py-3 text-right">
                            <span className="inline-flex items-center gap-1.5 text-xs text-navy/70">
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

            <Link href="/admin/orders" className="mt-4 flex items-center gap-1 text-sm text-accent hover:underline">
              View all orders <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Recently added products */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-navy">Recently Added Products</h2>
              <Link href="/admin/products" className="flex items-center gap-1 text-sm text-accent hover:underline">
                All products <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentProducts.length === 0 ? (
              <p className="mt-6 text-sm text-navy/50">No products yet.</p>
            ) : (
              <div className="mt-4 flex flex-col divide-y divide-sand">
               {recentProducts.map((prod: (typeof recentProducts)[number]) => {
                  const imgUrl = prod.images[0]?.url || "/images/Shoes/gmm.jpeg";
                  const price = prod.variants[0]?.price ? Number(prod.variants[0].price) : 0;
                  return (
                    <div key={prod.id} className="flex items-center gap-4 py-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-sand">
                        <Image src={imgUrl} alt={prod.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="font-[family-name:var(--font-display)] text-sm text-navy">{prod.name}</p>
                        <p className="text-xs text-navy/50">{prod.category?.name ?? "Footwear"}</p>
                      </div>
                      <p className="text-sm text-navy">${price.toFixed(2)}</p>
                      <p className="w-20 text-right text-xs text-navy/50">{timeAgo(prod.createdAt)}</p>
                    </div>
                  );
                })}
              </div>
            )}

            <Link href="/admin/products" className="mt-4 flex items-center gap-1 text-sm text-accent hover:underline">
              View all products <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-10">
          {/* Low stock */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-navy">Low Stock</h2>
              <Link href="/admin/inventory" className="flex items-center gap-1 text-sm text-accent hover:underline">
                View inventory <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {lowStockItems.length === 0 ? (
              <p className="mt-6 text-sm text-navy/50">All inventory levels healthy.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                {lowStockItems.map((item: (typeof lowStockItems)[number]) => {
                  const imgUrl = item.product.images?.[0]?.url || "/images/Shoes/gmm.jpeg";
                  const urgent = item.stock <= 2;
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-sand">
                        <Image src={imgUrl} alt={item.product.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-navy">{item.product.name}</p>
                        <p className="text-xs text-navy/50">Size {item.size} · {item.color}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${urgent ? "text-rose-600" : "text-amber-600"}`}>
                          {item.stock}
                        </p>
                        <p className="text-xs text-navy/40">remaining</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Link href="/admin/inventory" className="mt-4 flex items-center gap-1 text-sm text-accent hover:underline">
              View all inventory <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Quick actions */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-navy">Quick Actions</h2>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/admin/products/new"
                className="flex items-center gap-2 rounded-lg bg-navy px-4 py-3 text-sm font-medium text-cream hover:bg-navy/90"
              >
                <Plus className="h-4 w-4" /> Add Product
              </Link>
              <Link
                href="/admin/orders"
                className="flex items-center justify-between rounded-lg border border-sand px-4 py-3 text-sm text-navy hover:bg-cream-alt"
              >
                <span className="flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-navy/50" /> View Orders</span>
                <ArrowRight className="h-3.5 w-3.5 text-navy/40" />
              </Link>
              <Link
                href="/admin/inventory"
                className="flex items-center justify-between rounded-lg border border-sand px-4 py-3 text-sm text-navy hover:bg-cream-alt"
              >
                <span className="flex items-center gap-2"><Boxes className="h-4 w-4 text-navy/50" /> Manage Inventory</span>
                <ArrowRight className="h-3.5 w-3.5 text-navy/40" />
              </Link>
              <Link
                href="/admin/categories"
                className="flex items-center justify-between rounded-lg border border-sand px-4 py-3 text-sm text-navy hover:bg-cream-alt"
              >
                <span className="flex items-center gap-2"><Tag className="h-4 w-4 text-navy/50" /> Manage Categories</span>
                <ArrowRight className="h-3.5 w-3.5 text-navy/40" />
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center justify-between rounded-lg border border-sand px-4 py-3 text-sm text-navy hover:bg-cream-alt"
              >
                <span className="flex items-center gap-2"><Users className="h-4 w-4 text-navy/50" /> Manage Users</span>
                <ArrowRight className="h-3.5 w-3.5 text-navy/40" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}