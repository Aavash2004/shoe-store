"use client";

import { useState, useMemo, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Plus,
  ShoppingBag,
  Boxes,
  Tag,
  Users,
  RefreshCw,
  ChevronDown,
  Check,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency, convertCurrency } from "@/lib/constants/currencies";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { restockVariantQuantity } from "@/app/admin/inventory/actions";

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
  sku?: string;
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
  exchangeRates?: Record<string, number>;
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

const SUPPORTED_CURRENCIES = ["USD", "NPR", "EUR", "GBP"] as const;
type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

const CURRENCY_DETAILS: Record<CurrencyCode, { name: string; symbol: string }> = {
  USD: { name: "US Dollar", symbol: "$" },
  NPR: { name: "Nepalese Rupee", symbol: "Rs." },
  EUR: { name: "Euro", symbol: "€" },
  GBP: { name: "British Pound", symbol: "£" },
};

type LowStockFilterTier = "ALL" | "OUT" | "CRITICAL" | "LOW";

export function AdminDashboardClient({
  adminName,
  totalOrdersCount,
  totalProductsCount,
  lowStockCount,
  revenueOrders,
  recentOrders,
  recentProducts,
  lowStockItems,
  exchangeRates,
}: AdminDashboardClientProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>("USD");
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const currencyMenuRef = useRef<HTMLDivElement>(null);

  const [rates, setRates] = useState<Record<string, number>>(
    exchangeRates || {
      USD: 1.0,
      NPR: 134.5,
      EUR: 0.92,
      GBP: 0.78,
    }
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Dynamic Low Stock state
  const [stockItems, setStockItems] = useState<AdminDashboardLowStock[]>(lowStockItems);
  const [activeTier, setActiveTier] = useState<LowStockFilterTier>("ALL");
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const [, startRestockTransition] = useTransition();

  // Sync prop changes for stockItems during render
  const [prevLowStock, setPrevLowStock] = useState(lowStockItems);
  if (lowStockItems !== prevLowStock) {
    setPrevLowStock(lowStockItems);
    setStockItems(lowStockItems);
  }

  // Close currency dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (currencyMenuRef.current && !currencyMenuRef.current.contains(e.target as Node)) {
        setCurrencyDropdownOpen(false);
      }
    }
    if (currencyDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [currencyDropdownOpen]);

  const fetchRates = async (force = false) => {
    try {
      setIsSyncing(true);
      const res = await fetch(force ? "/api/currencies?refresh=true" : "/api/currencies");
      if (res.ok) {
        const data = await res.json();
        if (data?.rates) {
          setRates(data.rates);
          setLastSyncTime(
            new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          );
        }
      }
    } catch {
      // Gracefully maintain current rates on fetch failure
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch("/api/currencies")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.rates) {
          setRates(data.rates);
          setLastSyncTime(
            new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          );
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const syncCurrency = () => {
      const saved = localStorage.getItem("admin_selected_currency");
      if (saved && (SUPPORTED_CURRENCIES as readonly string[]).includes(saved)) {
        setSelectedCurrency(saved as CurrencyCode);
      }
    };

    syncCurrency();

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === "admin_selected_currency" &&
        e.newValue &&
        (SUPPORTED_CURRENCIES as readonly string[]).includes(e.newValue)
      ) {
        setSelectedCurrency(e.newValue as CurrencyCode);
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("admin_currency_change", syncCurrency);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("admin_currency_change", syncCurrency);
    };
  }, []);

  const handleCurrencyChange = (code: CurrencyCode) => {
    setSelectedCurrency(code);
    setCurrencyDropdownOpen(false);
    try {
      localStorage.setItem("admin_selected_currency", code);
      window.dispatchEvent(new Event("admin_currency_change"));
    } catch {}
  };

  // Inline Restock Handler (Atomic increment)
  function handleInlineRestock(variantId: string, amount: number) {
    setRestockingId(variantId);
    startRestockTransition(async () => {
      // Optimistic state increment
      setStockItems((prev) =>
        prev.map((item) =>
          item.id === variantId ? { ...item, stock: item.stock + amount } : item
        )
      );

      const res = await restockVariantQuantity(variantId, amount);
      setRestockingId(null);

      if (!res.success) {
        // Revert on failure
        setStockItems((prev) =>
          prev.map((item) =>
            item.id === variantId ? { ...item, stock: Math.max(0, item.stock - amount) } : item
          )
        );
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("show-toast", {
              detail: res.error || "Failed to restock item",
            })
          );
        }
      } else {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("show-toast", {
              detail: `Restocked variant (+${amount} units)`,
            })
          );
        }
      }
    });
  }

  // Sum all orders by converting each order into the selected currency using live exchange rates
  const totalRevenue = useMemo(() => {
    return revenueOrders.reduce((sum, order) => {
      const converted = convertCurrency(order.total, order.currency || "USD", selectedCurrency, rates);
      return sum + converted;
    }, 0);
  }, [revenueOrders, selectedCurrency, rates]);

  // Filtered Low Stock items by non-overlapping tiers
  const filteredLowStock = useMemo(() => {
    if (activeTier === "OUT") {
      return stockItems.filter((i) => i.stock === 0);
    }
    if (activeTier === "CRITICAL") {
      return stockItems.filter((i) => i.stock >= 1 && i.stock <= 2);
    }
    if (activeTier === "LOW") {
      return stockItems.filter((i) => i.stock >= 3 && i.stock <= 5);
    }
    return stockItems;
  }, [stockItems, activeTier]);

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Header with Title and Flag-based Currency Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-navy)]/55">
            Overview
          </span>
          <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[var(--color-navy)]">
            Welcome back, {adminName}
          </h1>
          <p className="mt-1 text-xs text-[var(--color-navy)]/60">
            Here&apos;s what&apos;s happening with your store today.
          </p>
        </div>

        {/* Currency Switcher Dropdown & Live Forex Sync */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchRates(true)}
            disabled={isSyncing}
            title="Force refresh rates directly from ExchangeRate-API"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-navy)]/70 hover:bg-white hover:text-[var(--color-navy)] transition-all disabled:opacity-50 shadow-2xs"
          >
            <RefreshCw className={`h-3 w-3 text-emerald-600 ${isSyncing ? "animate-spin" : ""}`} />
            <span>Forex API</span>
            {lastSyncTime && (
              <span className="text-[10px] text-[var(--color-navy)]/40 font-mono hidden xs:inline">
                ({lastSyncTime})
              </span>
            )}
          </button>

          {/* Compact Currency Dropdown with Flags */}
          <div ref={currencyMenuRef} className="relative inline-block text-left">
            <button
              type="button"
              onClick={() => setCurrencyDropdownOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={currencyDropdownOpen}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] px-3 py-1.5 text-xs font-semibold text-[var(--color-navy)] hover:bg-white hover:border-[var(--color-navy)]/30 transition-all shadow-2xs"
            >
              <FlagIcon currency={selectedCurrency} className="h-3.5 w-5 rounded-[2px] shadow-2xs object-cover" />
              <span className="font-bold">{selectedCurrency}</span>
              <span className="text-[11px] text-[var(--color-navy)]/50 font-medium">
                ({CURRENCY_DETAILS[selectedCurrency].symbol})
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-[var(--color-navy)]/50 transition-transform duration-200 ${
                  currencyDropdownOpen ? "rotate-180 text-[var(--color-navy)]" : ""
                }`}
              />
            </button>

            {currencyDropdownOpen && (
              <div
                role="listbox"
                className="absolute right-0 top-full mt-2 w-52 origin-top-right rounded-2xl border border-[var(--color-sand)] bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95"
              >
                <div className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest text-[var(--color-navy)]/40 border-b border-[var(--color-sand)]/60 mb-1">
                  Select Currency
                </div>
                <div className="space-y-0.5">
                  {SUPPORTED_CURRENCIES.map((code) => {
                    const active = selectedCurrency === code;
                    const detail = CURRENCY_DETAILS[code];
                    return (
                      <button
                        key={code}
                        role="option"
                        aria-selected={active}
                        type="button"
                        onClick={() => handleCurrencyChange(code)}
                        className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors ${
                          active
                            ? "bg-[var(--color-navy)] text-white font-bold"
                            : "text-[var(--color-navy)]/75 hover:bg-[var(--color-sand)]/40 hover:text-[var(--color-navy)] font-medium"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FlagIcon currency={code} className="h-3.5 w-5 rounded-[2px] shadow-2xs object-cover" />
                          <span className="font-bold">{code}</span>
                          <span className={active ? "text-white/70" : "text-[var(--color-navy)]/45"}>
                            · {detail.symbol}
                          </span>
                        </div>
                        {active && <Check className="h-3.5 w-3.5 text-white stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row: Enclosed in a clear, full border container with clean card dividers */}
      <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-4 sm:p-6 shadow-2xs">
        <div className="grid grid-cols-2 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-sand)]/70 lg:grid-cols-4">
          {/* Orders Card */}
          <div className="p-2 sm:p-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/50">
              Orders
            </p>
            <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold text-[var(--color-navy)]">
              {totalOrdersCount}
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-[var(--color-navy)]/45">
              All time orders
            </p>
          </div>

          {/* Revenue Card (Single Normalized Currency) */}
          <div className="p-2 sm:p-0 sm:pl-6 pt-4 sm:pt-0">
            <div className="flex items-center justify-between pr-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/50">
                Revenue
              </p>
              <span className="rounded bg-[var(--color-navy)]/8 px-1.5 py-0.5 text-[9px] font-extrabold text-[var(--color-navy)]/70">
                {selectedCurrency}
              </span>
            </div>
            <p className="mt-1.5 font-[family-name:var(--font-display)] text-xl sm:text-2xl xl:text-3xl font-extrabold text-[var(--color-navy)] tracking-tight">
              {formatCurrency(totalRevenue, selectedCurrency)}
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-[var(--color-navy)]/45">
              Normalized total
            </p>
          </div>

          {/* Products Card */}
          <div className="p-2 sm:p-0 sm:pl-6 pt-4 sm:pt-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/50">
              Products
            </p>
            <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold text-[var(--color-navy)]">
              {totalProductsCount}
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-[var(--color-navy)]/45">
              Active catalog items
            </p>
          </div>

          {/* Low Stock Card */}
          <div className="p-2 sm:p-0 sm:pl-6 pt-4 sm:pt-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/50">
              Low Stock
            </p>
            <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold text-[var(--color-navy)]">
              {lowStockCount}
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-[var(--color-navy)]/45">
              Variants to restock
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Low Stock & Quick Actions on LEFT (col-span-1), Orders & Products on RIGHT (col-span-2) */}
      <div className="grid grid-cols-1 gap-8 sm:gap-10 lg:grid-cols-3">
        {/* ========================================================
            LEFT COLUMN: Low Stock Alerts + Quick Actions
        ======================================================== */}
        <div className="space-y-8 sm:space-y-10 lg:col-span-1">
          {/* Dynamic Low Stock Card */}
          <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-sand)]/60">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">
                  Low Stock Alerts
                </h2>
              </div>
              <Link
                href="/admin/inventory"
                className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-navy)] hover:text-[var(--color-sky)] transition-colors"
              >
                Inventory <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Filter Tabs: Non-overlapping tiers */}
            <div className="flex items-center gap-1 mt-3 p-1 rounded-xl bg-white border border-[var(--color-sand)]/70 text-[10px] font-bold overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTier("ALL")}
                className={`rounded-lg px-2 py-1 transition-all shrink-0 ${
                  activeTier === "ALL"
                    ? "bg-[var(--color-navy)] text-white shadow-2xs"
                    : "text-[var(--color-navy)]/60 hover:text-[var(--color-navy)]"
                }`}
              >
                All ({stockItems.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTier("OUT")}
                className={`rounded-lg px-2 py-1 transition-all shrink-0 ${
                  activeTier === "OUT"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-rose-600/80 hover:text-rose-700"
                }`}
              >
                Out (0)
              </button>
              <button
                type="button"
                onClick={() => setActiveTier("CRITICAL")}
                className={`rounded-lg px-2 py-1 transition-all shrink-0 ${
                  activeTier === "CRITICAL"
                    ? "bg-rose-500 text-white shadow-2xs"
                    : "text-rose-500/80 hover:text-rose-600"
                }`}
              >
                Crit (1-2)
              </button>
              <button
                type="button"
                onClick={() => setActiveTier("LOW")}
                className={`rounded-lg px-2 py-1 transition-all shrink-0 ${
                  activeTier === "LOW"
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "text-amber-600/80 hover:text-amber-700"
                }`}
              >
                Low (3-5)
              </button>
            </div>

            {/* Items List with Inline Restock */}
            {filteredLowStock.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--color-navy)]/50">
                No items match this stock tier.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2.5">
                {filteredLowStock.map((item) => {
                  const isOut = item.stock === 0;
                  const isCritical = item.stock >= 1 && item.stock <= 2;
                  const isRestocking = restockingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 p-2.5 rounded-xl border border-[var(--color-sand)] bg-white shadow-2xs hover:border-[var(--color-navy)]/20 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--color-cream-alt)] border border-[var(--color-sand)]">
                          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[var(--color-navy)] truncate">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-[var(--color-navy)]/50 truncate">
                            Size {item.size} · {item.color} {item.sku ? `(${item.sku})` : ""}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isOut
                              ? "bg-rose-100 text-rose-700"
                              : isCritical
                              ? "bg-rose-50 text-rose-600 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {item.stock} left
                        </span>
                      </div>

                      {/* Inline Quick Restock Bar */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-[var(--color-sand)]/40 text-[10px]">
                        <span className="text-[var(--color-navy)]/45 font-medium">Quick restock:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isRestocking}
                            onClick={() => handleInlineRestock(item.id, 1)}
                            className="rounded-md border border-[var(--color-sand)] bg-[var(--color-cream-alt)] px-2 py-0.5 font-bold text-[var(--color-navy)] hover:bg-[var(--color-navy)] hover:text-white transition-colors disabled:opacity-50"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            disabled={isRestocking}
                            onClick={() => handleInlineRestock(item.id, 5)}
                            className="rounded-md border border-[var(--color-sand)] bg-[var(--color-cream-alt)] px-2 py-0.5 font-bold text-[var(--color-navy)] hover:bg-[var(--color-navy)] hover:text-white transition-colors disabled:opacity-50"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            disabled={isRestocking}
                            onClick={() => handleInlineRestock(item.id, 10)}
                            className="rounded-md border border-[var(--color-sand)] bg-[var(--color-cream-alt)] px-2 py-0.5 font-bold text-[var(--color-navy)] hover:bg-[var(--color-navy)] hover:text-white transition-colors disabled:opacity-50"
                          >
                            +10
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Actions Card */}
          <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-4 sm:p-5 shadow-2xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)] pb-3 border-b border-[var(--color-sand)]/60">
              Quick Actions
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href="/admin/products/new"
                className="flex items-center gap-2 rounded-xl bg-[var(--color-navy)] px-3.5 py-2.5 text-xs font-semibold text-[var(--color-cream)] hover:bg-[var(--color-navy)]/90 transition-colors shadow-2xs"
              >
                <Plus className="h-4 w-4 shrink-0" /> Add New Product
              </Link>
              <Link
                href="/admin/orders"
                className="flex items-center justify-between rounded-xl border border-[var(--color-sand)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 transition-colors shadow-2xs"
              >
                <span className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-[var(--color-navy)]/50 shrink-0" /> View Orders
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--color-navy)]/40 shrink-0" />
              </Link>
              <Link
                href="/admin/inventory"
                className="flex items-center justify-between rounded-xl border border-[var(--color-sand)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 transition-colors shadow-2xs"
              >
                <span className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-[var(--color-navy)]/50 shrink-0" /> Manage Inventory
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--color-navy)]/40 shrink-0" />
              </Link>
              <Link
                href="/admin/categories"
                className="flex items-center justify-between rounded-xl border border-[var(--color-sand)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 transition-colors shadow-2xs"
              >
                <span className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-[var(--color-navy)]/50 shrink-0" /> Manage Categories
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--color-navy)]/40 shrink-0" />
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center justify-between rounded-xl border border-[var(--color-sand)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 transition-colors shadow-2xs"
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[var(--color-navy)]/50 shrink-0" /> Manage Users
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--color-navy)]/40 shrink-0" />
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN: Recent Orders + Recently Added Products
        ======================================================== */}
        <div className="space-y-8 sm:space-y-10 lg:col-span-2">
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
                All orders <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <p className="mt-6 text-xs text-[var(--color-navy)]/50">No orders placed yet.</p>
            ) : (
              <>
                {/* Mobile View: Cards */}
                <div className="mt-4 flex flex-col gap-3 sm:hidden">
                  {recentOrders.map((order) => {
                    const isForeign = (order.currency || "USD") !== selectedCurrency;
                    const converted = convertCurrency(
                      order.total,
                      order.currency || "USD",
                      selectedCurrency,
                      rates
                    );

                    return (
                      <Link
                        key={order.id}
                        href={`/admin/orders/${order.id}`}
                        className="block rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-4 shadow-2xs hover:border-[var(--color-navy)]/30 hover:shadow-xs transition-all active:scale-[0.99]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-[var(--color-navy)]">
                            #{order.orderNumber}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-sand)] bg-[var(--color-cream)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--color-navy)]/80">
                            <span className={`h-1.5 w-1.5 rounded-full ${statusDot(order.status)}`} />
                            {statusLabel(order.status)}
                          </span>
                        </div>

                        <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-[var(--color-sand)]/60 pt-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[var(--color-navy)] truncate">
                              {order.customerName}
                            </p>
                            <p className="text-[10px] text-[var(--color-navy)]/50">
                              {order.itemsCount} {order.itemsCount === 1 ? "item" : "items"}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-[family-name:var(--font-display)] font-bold text-sm text-[var(--color-navy)]">
                              {formatCurrency(order.total, order.currency || "USD")}
                            </p>
                            {isForeign && (
                              <p className="text-[10px] font-medium text-[var(--color-navy)]/50">
                                ≈ {formatCurrency(converted, selectedCurrency)}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Tablet / Desktop View: Full Table */}
                <div className="mt-4 hidden sm:block overflow-x-auto rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]">
                  <table className="w-full min-w-[550px] text-left text-sm">
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
                          selectedCurrency,
                          rates
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
              </>
            )}
          </div>

          {/* Recently Added Products */}
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
                  const convertedPrice = convertCurrency(prod.price, "USD", selectedCurrency, rates);
                  return (
                    <div
                      key={prod.id}
                      className="flex items-center gap-3 sm:gap-4 px-3.5 sm:px-5 py-3 sm:py-3.5 hover:bg-[var(--color-sand)]/20 transition-colors"
                    >
                      <div className="relative h-11 w-11 sm:h-12 sm:w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--color-cream)] border border-[var(--color-sand)]">
                        <Image src={prod.imageUrl} alt={prod.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-[family-name:var(--font-display)] font-semibold text-xs sm:text-sm text-[var(--color-navy)] truncate">
                          {prod.name}
                        </p>
                        <p className="text-[11px] sm:text-xs text-[var(--color-navy)]/50 truncate">
                          {prod.categoryName}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs sm:text-sm font-bold text-[var(--color-navy)]">
                          {formatCurrency(convertedPrice, selectedCurrency)}
                        </p>
                        <p className="text-[10px] text-[var(--color-navy)]/50 sm:hidden">
                          {timeAgo(prod.createdAt)}
                        </p>
                      </div>
                      <p className="hidden sm:block w-20 text-right text-xs text-[var(--color-navy)]/50 shrink-0">
                        {timeAgo(prod.createdAt)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
