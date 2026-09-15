"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Plus, ShoppingBag, Boxes, Tag, Users, DollarSign } from "lucide-react";
import { formatCurrency, convertCurrency, CURRENCIES } from "@/lib/constants/currencies";

export type AdminDashboardOrder = {
  id: string;
  orderNumber: string;
  total: number;
  currency: string;
  status: string;
  itemsCount: number;
  customerName: string;
};

export type AdminDashboardProduct = {
  id: string;
  name: string;
  createdAt: string;
  categoryName: string;
  price: number;
  imageUrl: string;
};

export type AdminDashboardLowStock = {
  id: string;
  name: string;
  size: string;
  color: string;
  stock: number;
  imageUrl: string;
};

interface AdminDashboardClientProps {
  adminName: string;
  totalOrdersCount: number;
  totalProductsCount: number;
  lowStockCount: number;
  revenueOrders: { total: number; currency: string }[];
  recentOrders: AdminDashboardOrder[];
  recentProducts: AdminDashboardProduct[];
  lowStockItems: AdminDashboardLowStock[];
}

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

function timeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

const SUPPORTED_CURRENCIES = ["USD", "NPR", "EUR"] as const;
type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export function AdminDashboardClient({
  adminName,
  totalOrdersCount,
  totalProductsCount,
  lowStockCount,
  revenueOrders,
  recentOrders,
  recentProducts,
  lowStockItems,
}: AdminDashboardClientProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>("USD");

  // Sum all orders by converting each order into the selected currency
  const totalRevenue = useMemo(() => {
    return revenueOrders.reduce((sum, order) => {
      const converted = convertCurrency(order.total, order.currency || "USD", selectedCurrency);
      return sum + converted;
    }, 0);
  }, [revenueOrders, selectedCurrency]);

  return (
    <div className="space-y-10">
      {/* Header with Title and Currency Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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

        {/* Currency Switcher Control */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-navy)]/60">
            Currency:
          </span>
          <div className="inline-flex items-center rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-1 shadow-2xs">
            {SUPPORTED_CURRENCIES.map((code) => {
              const active = selectedCurrency === code;
              const symbol = CURRENCIES[code]?.symbol || code;
              return (
                <button
                  key={code}
                  onClick={() => setSelectedCurrency(code)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-all duration-150 ${
                    active
                      ? "bg-[var(--color-navy)] text-white shadow-xs scale-100"
                      : "text-[var(--color-navy)]/60 hover:text-[var(--color-navy)] hover:bg-white/60"
                  }`}
                >
                  <span>{code}</span>{" "}
                  <span className={active ? "text-white/80" : "text-[var(--color-navy)]/45"}>
                    ({symbol})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-6 divide-x divide-[var(--color-sand)] border-y border-[var(--color-sand)] py-6 sm:grid-cols-4">
        {/* Orders Card */}
        <div className="pl-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/50">
            Orders
          </p>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-navy)]">
            {totalOrdersCount}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-[var(--color-navy)]/45">
            All time orders
          </p>
        </div>

        {/* Revenue Card (Single Normalized Currency) */}
        <div className="pl-6">
          <div className="flex items-center justify-between pr-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/50">
              Revenue
            </p>
            <span className="rounded bg-[var(--color-navy)]/8 px-1.5 py-0.5 text-[9px] font-extrabold text-[var(--color-navy)]/70">
              {selectedCurrency}
            </span>
          </div>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold text-[var(--color-navy)] tracking-tight">
            {formatCurrency(totalRevenue, selectedCurrency)}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-[var(--color-navy)]/45">
            Normalized across all orders
          </p>
        </div>

        {/* Products Card */}
        <div className="pl-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/50">
            Products
          </p>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-navy)]">
            {totalProductsCount}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-[var(--color-navy)]/45">
            Active products
          </p>
        </div>

        {/* Low Stock Card */}
        <div className="pl-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/50">
            Low Stock
          </p>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--color-navy)]">
            {lowStockCount}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-[var(--color-navy)]/45">
            Variants to restock
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Left column: Orders and Products */}
        <div className="space-y-10 lg:col-span-2">
          {/* Recent Orders */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">
                Recent Orders
              </h2>
              <Link
                href="/admin/orders"
                className="flex items-center gap-1 text-xs font-semibold text-[var(--color-navy)] hover:text-[var(--color-sky)] transition-colors"
              >
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
                      <th className="px-5 py-3 text-right font-bold">Total ({selectedCurrency})</th>
                      <th className="px-5 py-3 text-right font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-sand)]/70">
                    {recentOrders.map((order) => {
                      const isForeign = (order.currency || "USD") !== selectedCurrency;
                      const converted = convertCurrency(
                        order.total,
                        order.currency || "USD",
                        selectedCurrency
                      );

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-[var(--color-sand)]/20 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="font-mono font-bold text-[var(--color-navy)] hover:underline"
                            >
                              #{order.orderNumber}
                            </Link>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-medium text-[var(--color-navy)]/80">
                            {order.customerName}
                          </td>
                          <td className="px-5 py-3.5 text-center text-xs text-[var(--color-navy)]/70">
                            {order.itemsCount}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <p className="font-bold text-[var(--color-navy)]">
                              {formatCurrency(order.total, order.currency || "USD")}
                            </p>
                            {isForeign && (
                              <p className="text-[10px] font-medium text-[var(--color-navy)]/50">
                                ≈ {formatCurrency(converted, selectedCurrency)}
                              </p>
                            )}
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
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">
                Recently Added Products
              </h2>
              <Link
                href="/admin/products"
                className="flex items-center gap-1 text-xs font-semibold text-[var(--color-navy)] hover:text-[var(--color-sky)] transition-colors"
              >
                All products <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentProducts.length === 0 ? (
              <p className="mt-6 text-xs text-[var(--color-navy)]/50">No products yet.</p>
            ) : (
              <div className="mt-4 flex flex-col divide-y divide-[var(--color-sand)] rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] overflow-hidden">
                {recentProducts.map((prod) => {
                  const convertedPrice = convertCurrency(prod.price, "USD", selectedCurrency);
                  return (
                    <div
                      key={prod.id}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--color-sand)]/20 transition-colors"
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--color-cream)] border border-[var(--color-sand)]">
                        <Image src={prod.imageUrl} alt={prod.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-[family-name:var(--font-display)] font-semibold text-sm text-[var(--color-navy)] truncate">
                          {prod.name}
                        </p>
                        <p className="text-xs text-[var(--color-navy)]/50">{prod.categoryName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[var(--color-navy)]">
                          {formatCurrency(convertedPrice, selectedCurrency)}
                        </p>
                      </div>
                      <p className="w-20 text-right text-xs text-[var(--color-navy)]/50">
                        {timeAgo(prod.createdAt)}
                      </p>
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
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">
                Low Stock Alerts
              </h2>
              <Link
                href="/admin/inventory"
                className="flex items-center gap-1 text-xs font-semibold text-[var(--color-navy)] hover:text-[var(--color-sky)] transition-colors"
              >
                View inventory <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {lowStockItems.length === 0 ? (
              <p className="mt-6 text-xs text-[var(--color-navy)]/50">
                All inventory levels healthy.
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-2.5">
                {lowStockItems.map((item) => {
                  const urgent = item.stock <= 2;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]"
                    >
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[var(--color-cream)] border border-[var(--color-sand)]">
                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--color-navy)] truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-[var(--color-navy)]/50">
                          Size {item.size} · {item.color}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-xs font-bold ${
                            urgent ? "text-rose-600" : "text-amber-600"
                          }`}
                        >
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
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">
              Quick Actions
            </h2>
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
                <span className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-[var(--color-navy)]/50" /> View Orders
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--color-navy)]/40" />
              </Link>
              <Link
                href="/admin/inventory"
                className="flex items-center justify-between rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] px-4 py-2.5 text-xs font-semibold text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-[var(--color-navy)]/50" /> Manage Inventory
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--color-navy)]/40" />
              </Link>
              <Link
                href="/admin/categories"
                className="flex items-center justify-between rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] px-4 py-2.5 text-xs font-semibold text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-[var(--color-navy)]/50" /> Manage Categories
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--color-navy)]/40" />
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center justify-between rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] px-4 py-2.5 text-xs font-semibold text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[var(--color-navy)]/50" /> Manage Users
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--color-navy)]/40" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
