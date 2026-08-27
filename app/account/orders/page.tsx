"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ShoppingBag, ArrowRight, Loader2 } from "lucide-react";

interface OrderItemData {
  id: string;
  productName: string;
  size: string;
  color: string;
  price: string;
  quantity: number;
  variant?: {
    product?: {
      images?: { url: string }[];
    };
  };
}

interface OrderData {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  total: string;
  items: OrderItemData[];
}

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const statusOptions = [
    { label: "ALL", value: "ALL" },
    { label: "PROCESSING", value: "PROCESSING" },
    { label: "SHIPPED", value: "SHIPPED" },
    { label: "DELIVERED", value: "DELIVERED" },
    { label: "CANCELLED", value: "CANCELLED" },
  ];

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus, searchQuery]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await fetch(`/api/me/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const statusBadgeStyle = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-slate-100 text-slate-700 border-slate-300";
      case "CONFIRMED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "PROCESSING":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "SHIPPED":
        return "bg-[var(--color-sky)]/20 text-[var(--color-navy)] border-[var(--color-sky)]/40";
      case "DELIVERED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)]">
          My Orders
        </h1>
        <p className="text-sm text-[var(--color-navy)]/60 mt-1">
          Track and review your past order history and delivery statuses.
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-navy)]/50">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order # or product name..."
            className="w-full pl-10 pr-4 py-3 bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl text-sm text-[var(--color-navy)] placeholder-[var(--color-navy)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)] transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {statusOptions.map((opt) => {
            const active = selectedStatus === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelectedStatus(opt.value)}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all border ${
                  active
                    ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)] shadow-xs"
                    : "bg-[var(--color-cream-alt)] text-[var(--color-navy)]/70 border-[var(--color-sand)] hover:bg-[var(--color-sand)]/50"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-sand)]/60 text-[var(--color-navy)]/60 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-navy)]">
              Your order history is empty.
            </h3>
            <p className="text-xs text-[var(--color-navy)]/60 max-w-sm mx-auto">
              {searchQuery || selectedStatus !== "ALL"
                ? "No orders match your filter criteria."
                : "You haven't made any purchases with us yet."}
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-navy)] text-[var(--color-cream)] rounded-xl text-xs font-semibold hover:bg-[var(--color-navy)]/90 transition-colors shadow-xs"
          >
            <span>START SHOPPING</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const totalItems = order.items.reduce(
              (acc, item) => acc + item.quantity,
              0
            );

            return (
              <div
                key={order.id}
                className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-6 space-y-5 transition-all hover:border-[var(--color-sand)]/80 shadow-xs"
              >
                {/* Top Info Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[var(--color-sand)]">
                  <div>
                    <span className="font-mono text-sm font-bold text-[var(--color-navy)] block">
                      ORDER #{order.orderNumber}
                    </span>
                    <span className="text-xs text-[var(--color-navy)]/60">
                      Placed on{" "}
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusBadgeStyle(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Thumbnails & Items Preview */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
                    {order.items.map((item) => {
                      const imgUrl =
                        item.variant?.product?.images?.[0]?.url ||
                        "/images/Shoes/gmm.jpeg";
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 bg-[var(--color-cream)] border border-[var(--color-sand)] rounded-xl p-2 shrink-0 max-w-xs"
                        >
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-stone-200 shrink-0">
                            <Image
                              src={imgUrl}
                              alt={item.productName}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="pr-2 min-w-0">
                            <p className="text-xs font-medium text-[var(--color-navy)] truncate">
                              👟 {item.productName}
                            </p>
                            <p className="text-[10px] text-[var(--color-navy)]/60">
                              Size {item.size} · {item.color} · Qty {item.quantity}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Footer Bar */}
                <div className="pt-3 border-t border-[var(--color-sand)]/60 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-[var(--color-navy)]/60">
                      {totalItems} {totalItems === 1 ? "item" : "items"}
                    </span>
                    <span className="font-bold text-base text-[var(--color-navy)] ml-3">
                      ${Number(order.total).toFixed(2)}
                    </span>
                  </div>

                  <Link
                    href={`/account/orders/${order.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--color-navy)] text-[var(--color-cream)] rounded-xl text-xs font-medium hover:bg-[var(--color-navy)]/90 transition-colors"
                  >
                    <span>VIEW ORDER</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}