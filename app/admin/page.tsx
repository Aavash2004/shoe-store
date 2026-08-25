import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { ArrowRight, Plus, Package, ShoppingBag, Boxes } from "lucide-react";

export default async function AdminDashboardPage() {
  const session = await auth();
  const adminName = session?.user?.name || session?.user?.email?.split("@")[0] || "Admin";

  // Real database queries with fallbacks
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
    prisma.productVariant.count({
      where: { stock: { lte: 5 }, isActive: true },
    }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.productVariant.findMany({
      where: { stock: { lte: 5 }, isActive: true },
      take: 4,
      include: {
        product: { select: { name: true, slug: true } },
      },
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
    prisma.order.aggregate({
      _sum: { total: true },
    }),
  ]);

  const totalRevenue = Number(revenueAggregate._sum.total || 0);

  // Mapped status indicator dots & subdued colors
  const renderStatusDot = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium text-xs"><span className="w-2 h-2 rounded-full bg-emerald-500" />Delivered</span>;
      case "SHIPPED":
        return <span className="inline-flex items-center gap-1.5 text-[var(--color-navy)] font-medium text-xs"><span className="w-2 h-2 rounded-full bg-[var(--color-sky)]" />Shipped</span>;
      case "PROCESSING":
        return <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium text-xs"><span className="w-2 h-2 rounded-full bg-amber-500" />Processing</span>;
      case "CANCELLED":
        return <span className="inline-flex items-center gap-1.5 text-rose-700 font-medium text-xs"><span className="w-2 h-2 rounded-full bg-rose-500" />Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium text-xs"><span className="w-2 h-2 rounded-full bg-slate-400" />{status}</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header Section */}
      <div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-navy)]/55 block">
          Admin Dashboard
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)] mt-0.5">
          Welcome back, {adminName}
        </h1>
      </div>

      {/* 2. Compact Horizontal Store Metrics Bar */}
      <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-xl p-4 sm:p-6 grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-[var(--color-sand)]">
        <div className="pt-2 md:pt-0 md:px-4 first:px-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
            Orders
          </p>
          <p className="font-[family-name:var(--font-body)] text-2xl sm:text-3xl font-bold text-[var(--color-navy)] tracking-tight mt-1">
            {totalOrdersCount}
          </p>
        </div>

        <div className="pt-2 md:pt-0 md:px-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
            Revenue
          </p>
          <p className="font-[family-name:var(--font-body)] text-2xl sm:text-3xl font-bold text-[var(--color-navy)] tracking-tight mt-1">
            ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="pt-2 md:pt-0 md:px-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
            Products
          </p>
          <p className="font-[family-name:var(--font-body)] text-2xl sm:text-3xl font-bold text-[var(--color-navy)] tracking-tight mt-1">
            {totalProductsCount}
          </p>
        </div>

        <div className="pt-2 md:pt-0 md:px-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
            Low Stock
          </p>
          <p className="font-[family-name:var(--font-body)] text-2xl sm:text-3xl font-bold text-amber-800 tracking-tight mt-1">
            {lowStockCount}
          </p>
        </div>
      </div>

      {/* 3. Main Dashboard Grid (2-Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3 width) - Orders Table & Recent Products */}
        <div className="lg:col-span-2 space-y-8">
          {/* RECENT ORDERS TABLE */}
          <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">
                Recent Orders
              </h2>
              <Link
                href="/admin/orders"
                className="text-xs font-semibold text-[var(--color-navy)] hover:text-[var(--color-sky)] transition-colors inline-flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <p className="text-xs text-[var(--color-navy)]/60 py-4 text-center">
                No recent orders found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--color-sand)] text-[10px] uppercase font-bold text-[var(--color-navy)]/55 tracking-wider">
                      <th className="pb-2.5 font-semibold">Order</th>
                      <th className="pb-2.5 font-semibold">Customer</th>
                      <th className="pb-2.5 font-semibold text-center">Items</th>
                      <th className="pb-2.5 font-semibold text-right">Total</th>
                      <th className="pb-2.5 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-sand)]/60 text-xs">
                    {recentOrders.map((order) => {
                      const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
                      const customerName =
                        order.user?.name || order.user?.email || "Guest Customer";

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-[var(--color-sand)]/30 transition-colors"
                        >
                          <td className="py-3 font-mono font-bold text-[var(--color-navy)]">
                            <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                              #{order.orderNumber}
                            </Link>
                          </td>
                          <td className="py-3 text-[var(--color-navy)]/85 truncate max-w-[140px]">
                            {customerName}
                          </td>
                          <td className="py-3 text-center text-[var(--color-navy)]/70">
                            {totalQty}
                          </td>
                          <td className="py-3 text-right font-semibold text-[var(--color-navy)]">
                            ${Number(order.total).toFixed(2)}
                          </td>
                          <td className="py-3 text-right">
                            {renderStatusDot(order.status)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RECENTLY ADDED PRODUCTS */}
          <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">
                Recently Added Products
              </h2>
              <Link
                href="/admin/products"
                className="text-xs font-semibold text-[var(--color-navy)] hover:text-[var(--color-sky)] transition-colors inline-flex items-center gap-1"
              >
                <span>All products</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentProducts.length === 0 ? (
              <p className="text-xs text-[var(--color-navy)]/60 py-4 text-center">
                No products found in catalog.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentProducts.map((prod) => {
                  const imgUrl = prod.images[0]?.url || "/images/Shoes/s05.avif";
                  const price = prod.variants[0]?.price ? Number(prod.variants[0].price) : 0;

                  return (
                    <div
                      key={prod.id}
                      className="bg-[var(--color-cream)] border border-[var(--color-sand)] rounded-lg p-3 flex items-center gap-3"
                    >
                      <div className="relative w-11 h-11 rounded-md overflow-hidden bg-stone-200 shrink-0 border border-[var(--color-sand)]">
                        <Image
                          src={imgUrl}
                          alt={prod.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-[var(--color-navy)] truncate">
                          {prod.name}
                        </h3>
                        <p className="text-[10px] text-[var(--color-navy)]/60">
                          {prod.category?.name || "Footwear"} · ${price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3 width) - Low Stock & Quick Actions */}
        <div className="space-y-8">
          {/* LOW STOCK SECTION */}
          <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">
                Low Stock Alerts
              </h2>
              <Link
                href="/admin/inventory"
                className="text-xs font-semibold text-[var(--color-navy)] hover:text-[var(--color-sky)] transition-colors inline-flex items-center gap-1"
              >
                <span>View inventory</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="py-4 text-center space-y-1">
                <p className="text-xs font-medium text-emerald-800">
                  All inventory levels healthy.
                </p>
                <p className="text-[10px] text-[var(--color-navy)]/55">
                  No product variants currently under 5 units.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[var(--color-cream)] border border-[var(--color-sand)] rounded-lg p-3 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[var(--color-navy)] truncate max-w-[140px]">
                        {item.product.name}
                      </p>
                      <p className="text-[10px] text-[var(--color-navy)]/60">
                        Size {item.size} · {item.color}
                      </p>
                    </div>

                    <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                      {item.stock} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QUICK ACTIONS */}
          <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-xl p-5 sm:p-6 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">
              Quick Actions
            </h2>

            <div className="space-y-2">
              <Link
                href="/admin/products"
                className="w-full px-4 py-2.5 bg-[var(--color-navy)] text-[var(--color-cream)] text-xs font-semibold rounded-lg hover:bg-[var(--color-navy)]/90 transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </Link>

              <Link
                href="/admin/orders"
                className="w-full px-4 py-2.5 bg-[var(--color-cream)] text-[var(--color-navy)] border border-[var(--color-sand)] text-xs font-semibold rounded-lg hover:bg-[var(--color-sand)]/40 transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-[var(--color-navy)]/65" />
                <span>View Orders</span>
              </Link>

              <Link
                href="/admin/inventory"
                className="w-full px-4 py-2.5 bg-[var(--color-cream)] text-[var(--color-navy)] border border-[var(--color-sand)] text-xs font-semibold rounded-lg hover:bg-[var(--color-sand)]/40 transition-colors flex items-center justify-center gap-2"
              >
                <Boxes className="w-3.5 h-3.5 text-[var(--color-navy)]/65" />
                <span>Manage Inventory</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
