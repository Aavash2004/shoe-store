"use client";

import { useState, useMemo, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  Download,
  RefreshCw,
  MoreVertical,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Package,
  Clock,
  Truck,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Eye,
  ArrowUpDown,
  ShoppingBag,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, convertCurrency, CURRENCIES } from "@/lib/constants/currencies";
import { updateOrderStatus } from "@/app/admin/orders/[id]/actions";

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  total: number;
  currency: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  shippingCity?: string;
  shippingCountry?: string;
  items: {
    id: string;
    productName: string;
    size: string;
    color: string;
    quantity: number;
    price: number;
    imageUrl?: string;
    slug?: string;
  }[];
};

interface AdminOrdersClientProps {
  initialOrders: AdminOrderRow[];
  exchangeRates?: Record<string, number>;
}

const SUPPORTED_CURRENCIES = ["USD", "NPR", "EUR", "GBP"] as const;
type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

type FilterTab = "ALL" | "UNFULFILLED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export function AdminOrdersClient({ initialOrders, exchangeRates }: AdminOrdersClientProps) {
  const router = useRouter();
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>("USD");
  const [rates, setRates] = useState<Record<string, number>>(
    exchangeRates || {
      USD: 1.0,
      NPR: CURRENCIES.NPR?.rateToBaseUSD ?? 135.0,
      GBP: CURRENCIES.GBP?.rateToBaseUSD ?? 0.78,
      EUR: CURRENCIES.EUR?.rateToBaseUSD ?? 0.92,
    }
  );

  useEffect(() => {
    fetch("/api/currencies")
      .then((r) => r.json())
      .then((data) => {
        if (data?.rates) setRates(data.rates);
      })
      .catch(() => {});
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
    try {
      localStorage.setItem("admin_selected_currency", code);
      window.dispatchEvent(new Event("admin_currency_change"));
    } catch {}
  };

  const [orders, setOrders] = useState<AdminOrderRow[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<FilterTab>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isUpdatingStatus, startStatusTransition] = useTransition();

  const menuRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 10;

  // Sync state if initialOrders prop changes
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Close context menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActionMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate High-Priority Triage KPIs
  const stats = useMemo(() => {
    const total = orders.length;
    const unfulfilled = orders.filter(
      (o) => o.status === "PENDING" || o.status === "CONFIRMED"
    ).length;
    const processing = orders.filter((o) => o.status === "PROCESSING").length;
    const shipped = orders.filter((o) => o.status === "SHIPPED").length;
    const delivered = orders.filter((o) => o.status === "DELIVERED").length;
    const cancelled = orders.filter((o) => o.status === "CANCELLED").length;

    const completedOrders = orders.filter((o) => o.status !== "CANCELLED");
    const totalRevenue = completedOrders.reduce((sum, o) => {
      const converted = convertCurrency(Number(o.total || 0), o.currency || "USD", selectedCurrency, rates);
      return sum + converted;
    }, 0);
    const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    return {
      total,
      unfulfilled,
      processing,
      shipped,
      delivered,
      cancelled,
      totalRevenue,
      avgOrderValue,
    };
  }, [orders, selectedCurrency]);

  // Filter and Search Logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (selectedTab === "UNFULFILLED") {
        if (order.status !== "PENDING" && order.status !== "CONFIRMED") return false;
      } else if (selectedTab === "PROCESSING") {
        if (order.status !== "PROCESSING") return false;
      } else if (selectedTab === "SHIPPED") {
        if (order.status !== "SHIPPED") return false;
      } else if (selectedTab === "DELIVERED") {
        if (order.status !== "DELIVERED") return false;
      } else if (selectedTab === "CANCELLED") {
        if (order.status !== "CANCELLED") return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNum = order.orderNumber.toLowerCase().includes(q);
        const matchesCustomer = order.customerName.toLowerCase().includes(q);
        const matchesEmail = order.customerEmail.toLowerCase().includes(q);
        const matchesItem = order.items.some((i) => i.productName.toLowerCase().includes(q));

        if (!matchesNum && !matchesCustomer && !matchesEmail && !matchesItem) {
          return false;
        }
      }

      return true;
    });
  }, [orders, selectedTab, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, currentPage]);

  // Reset pagination on search or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTab]);

  // Quick Status Update
  function handleQuickStatus(orderId: string, nextStatus: string) {
    setActionMenuOpenId(null);
    startStatusTransition(async () => {
      // Optimistic UI update
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );

      const res = await updateOrderStatus(orderId, nextStatus);
      if (res.success) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("show-toast", {
              detail: `Order status updated to ${nextStatus}`,
            })
          );
        }
        router.refresh();
      } else {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("show-toast", {
              detail: res.error || "Failed to update status",
            })
          );
        }
        router.refresh();
      }
    });
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  function handleRefresh() {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  }

  // Export CSV
  function handleExportCSV() {
    const headers = [
      "Order Number",
      "Customer Name",
      "Customer Email",
      "Date",
      "Fulfillment Status",
      "Payment Status",
      "Payment Method",
      "Currency",
      "Total Amount",
      "Items Count",
    ];

    const rows = filteredOrders.map((o) => [
      `"${o.orderNumber}"`,
      `"${(o.customerName || "").replace(/"/g, '""')}"`,
      `"${(o.customerEmail || "").replace(/"/g, '""')}"`,
      `"${new Date(o.createdAt).toISOString()}"`,
      `"${o.status}"`,
      `"${o.paymentStatus}"`,
      `"${o.paymentMethod || "N/A"}"`,
      `"${o.currency || "USD"}"`,
      Number(o.total || 0).toFixed(2),
      o.items.reduce((sum, i) => sum + i.quantity, 0),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `orders-export-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Operational Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-navy)]/55">
              Operations Desk
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Queue
            </span>
          </div>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[var(--color-navy)]">
            Order Queue
          </h1>
          <p className="text-xs text-[var(--color-navy)]/65 mt-0.5">
            Triage customer purchases, manage packaging, dispatch status, and fulfillment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Currency Switcher Control */}
          <div className="inline-flex items-center rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-1 shadow-2xs">
            {SUPPORTED_CURRENCIES.map((code) => {
              const active = selectedCurrency === code;
              const symbol = CURRENCIES[code]?.symbol || code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleCurrencyChange(code)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all duration-150 ${
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

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-sand)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-navy)] shadow-2xs hover:bg-[var(--color-sand)]/30 transition-all"
            title="Refresh Orders"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-sand)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-navy)] shadow-2xs hover:bg-[var(--color-sand)]/30 transition-all"
            title="Export CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 6-Card "Quick Stats" KPI Triage Ribbon (Inspired by Confidency OS) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* 1. Total Orders */}
        <div className="rounded-2xl border border-[var(--color-sand)] bg-white p-3.5 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-navy)]/60">
              Total Orders
            </span>
            <ShoppingBag className="h-3.5 w-3.5 text-[var(--color-navy)]/40" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--color-navy)]">{stats.total}</div>
          <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
            <span>Live total in database</span>
          </div>
        </div>

        {/* 2. Needs Action / Unfulfilled */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3.5 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Needs Action
            </span>
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">{stats.unfulfilled}</div>
          <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
            <span>Pending packing</span>
          </div>
        </div>

        {/* 3. Processing */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-3.5 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
              Processing
            </span>
            <Clock className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-900">{stats.processing}</div>
          <div className="mt-1 text-[10px] font-semibold text-blue-700">
            <span>Packing in progress</span>
          </div>
        </div>

        {/* 4. Shipped / In Transit */}
        <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-3.5 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
              In Transit
            </span>
            <Truck className="h-3.5 w-3.5 text-sky-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-sky-900">{stats.shipped}</div>
          <div className="mt-1 text-[10px] font-semibold text-sky-700">
            <span>With courier</span>
          </div>
        </div>

        {/* 5. Total Revenue */}
        <div className="rounded-2xl border border-[var(--color-sand)] bg-white p-3.5 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-navy)]/60">
              Total Revenue
            </span>
            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-[var(--color-navy)] truncate">
            {formatCurrency(stats.totalRevenue, selectedCurrency)}
          </div>
          <div className="mt-1 text-[10px] font-semibold text-emerald-700">
            <span>Paid sales in {selectedCurrency}</span>
          </div>
        </div>

        {/* 6. Avg Order Value */}
        <div className="rounded-2xl border border-[var(--color-sand)] bg-white p-3.5 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-navy)]/60">
              Avg Order Value
            </span>
            <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-[var(--color-navy)] truncate">
            {formatCurrency(stats.avgOrderValue, selectedCurrency)}
          </div>
          <div className="mt-1 text-[10px] font-semibold text-[var(--color-navy)]/50">
            <span>Per basket ({selectedCurrency})</span>
          </div>
        </div>
      </div>

      {/* Interactive Main Surface: Toolbar + Table */}
      <div className="rounded-3xl border border-[var(--color-sand)] bg-white shadow-sm overflow-hidden">
        {/* Toolbar: Search + Filter Tabs */}
        <div className="flex flex-col gap-4 border-b border-[var(--color-sand)]/70 p-4 sm:flex-row sm:items-center sm:justify-between bg-white">
          {/* Status Tabs Bar */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedTab("ALL")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                selectedTab === "ALL"
                  ? "bg-[var(--color-navy)] text-white shadow-xs"
                  : "bg-slate-100 text-[var(--color-navy)]/70 hover:bg-slate-200"
              }`}
            >
              <span>All</span>
              <span
                className={`rounded-md px-1.5 py-0.2 text-[10px] ${
                  selectedTab === "ALL" ? "bg-white/20 text-white" : "bg-white text-[var(--color-navy)]"
                }`}
              >
                {stats.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTab("UNFULFILLED")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                selectedTab === "UNFULFILLED"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              <span>Needs Action</span>
              <span
                className={`rounded-md px-1.5 py-0.2 text-[10px] ${
                  selectedTab === "UNFULFILLED"
                    ? "bg-white/20 text-white"
                    : "bg-amber-200/80 text-amber-900"
                }`}
              >
                {stats.unfulfilled}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTab("PROCESSING")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                selectedTab === "PROCESSING"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-blue-50 text-blue-800 hover:bg-blue-100"
              }`}
            >
              <span>Processing</span>
              <span
                className={`rounded-md px-1.5 py-0.2 text-[10px] ${
                  selectedTab === "PROCESSING"
                    ? "bg-white/20 text-white"
                    : "bg-blue-200/80 text-blue-900"
                }`}
              >
                {stats.processing}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTab("SHIPPED")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                selectedTab === "SHIPPED"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-sky-50 text-sky-800 hover:bg-sky-100"
              }`}
            >
              <span>Shipped</span>
              <span
                className={`rounded-md px-1.5 py-0.2 text-[10px] ${
                  selectedTab === "SHIPPED"
                    ? "bg-white/20 text-white"
                    : "bg-sky-200/80 text-sky-900"
                }`}
              >
                {stats.shipped}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTab("DELIVERED")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                selectedTab === "DELIVERED"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              <span>Delivered</span>
              <span
                className={`rounded-md px-1.5 py-0.2 text-[10px] ${
                  selectedTab === "DELIVERED"
                    ? "bg-white/20 text-white"
                    : "bg-emerald-200/80 text-emerald-900"
                }`}
              >
                {stats.delivered}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTab("CANCELLED")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                selectedTab === "CANCELLED"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-50 text-rose-800 hover:bg-rose-100"
              }`}
            >
              <span>Cancelled</span>
              <span
                className={`rounded-md px-1.5 py-0.2 text-[10px] ${
                  selectedTab === "CANCELLED"
                    ? "bg-white/20 text-white"
                    : "bg-rose-200/80 text-rose-900"
                }`}
              >
                {stats.cancelled}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-navy)]/40" />
            <input
              type="text"
              placeholder="Search order #, customer, shoe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-[var(--color-sand)] bg-white pl-9 pr-8 text-xs text-[var(--color-navy)] placeholder:text-[var(--color-navy)]/40 focus:border-[var(--color-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)] shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-navy)]/40 hover:text-[var(--color-navy)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-sand)]/70 bg-[var(--color-cream-alt)]/60 text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-navy)]/60">
                <th className="px-5 py-3.5">Order</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Items</th>
                <th className="px-5 py-3.5">Destination</th>
                <th className="px-5 py-3.5 text-right">Total ({selectedCurrency})</th>
                <th className="px-5 py-3.5 text-center">Payment</th>
                <th className="px-5 py-3.5 text-center">Fulfillment</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-sand)]/50">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-xs text-[var(--color-navy)]/50">
                    <Package className="mx-auto mb-2 h-8 w-8 text-[var(--color-navy)]/25" />
                    <p className="font-semibold text-[var(--color-navy)]/70">No orders found</p>
                    <p className="mt-0.5 text-[11px]">
                      {searchQuery
                        ? `No matches for "${searchQuery}" in this view.`
                        : "No orders match the selected filter."}
                    </p>
                    {(searchQuery || selectedTab !== "ALL") && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedTab("ALL");
                        }}
                        className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[var(--color-sand)]/60 px-2.5 py-1 text-[11px] font-bold text-[var(--color-navy)] hover:bg-[var(--color-sand)] transition-all"
                      >
                        Reset filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const totalItemsQty = order.items.reduce((sum, i) => sum + i.quantity, 0);
                  const firstItem = order.items[0];
                  const extraItemsCount = order.items.length - 1;

                  // Payment badge logic
                  const isPaid = order.paymentStatus === "PAID";
                  const isFailed = order.paymentStatus === "FAILED";
                  const methodLabel =
                    order.paymentMethod === "STRIPE"
                      ? "Stripe"
                      : order.paymentMethod === "KHALTI"
                      ? "Khalti"
                      : order.paymentMethod || "COD";

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[var(--color-cream-alt)]/40 transition-colors group"
                    >
                      {/* 1. Order ID & Date */}
                      <td className="px-5 py-3.5 font-mono">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-bold text-[var(--color-navy)] hover:underline flex items-center gap-1.5"
                        >
                          #{order.orderNumber}
                        </Link>
                        <span className="text-[10px] text-[var(--color-navy)]/50 font-sans block mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>

                      {/* 2. Customer */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-sand)] text-[11px] font-bold text-[var(--color-navy)]">
                            {order.customerName.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[var(--color-navy)] truncate max-w-[140px]">
                              {order.customerName}
                            </p>
                            <p className="text-[11px] text-[var(--color-navy)]/50 truncate max-w-[140px]">
                              {order.customerEmail}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 3. Items with Thumbnail Snippet */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {firstItem?.imageUrl ? (
                            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-[var(--color-sand)]/70 bg-[var(--color-cream-alt)]">
                              <Image
                                src={firstItem.imageUrl}
                                alt={firstItem.productName}
                                fill
                                sizes="36px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-sand)] bg-[var(--color-sand)]/30 text-[var(--color-navy)]/40">
                              <Package className="h-4 w-4" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="font-medium text-[var(--color-navy)] truncate max-w-[160px]">
                              {firstItem?.quantity || 1}× {firstItem?.productName || "Shoe item"}
                            </p>
                            <p className="text-[10px] text-[var(--color-navy)]/50">
                              Size {firstItem?.size || "N/A"}
                              {extraItemsCount > 0 && (
                                <span className="ml-1 text-emerald-700 font-bold">
                                  +{extraItemsCount} more
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 4. Destination */}
                      <td className="px-5 py-3.5 text-[var(--color-navy)]/70">
                        {order.shippingCity ? (
                          <span>
                            {order.shippingCity}
                            {order.shippingCountry ? `, ${order.shippingCountry}` : ""}
                          </span>
                        ) : (
                          <span className="text-[var(--color-navy)]/40">Online standard</span>
                        )}
                      </td>

                      {/* 5. Total */}
                      <td className="px-5 py-3.5 text-right">
                        {(() => {
                          const isForeign = (order.currency || "USD").toUpperCase() !== selectedCurrency.toUpperCase();
                          const converted = convertCurrency(
                            Number(order.total || 0),
                            order.currency || "USD",
                            selectedCurrency,
                            rates
                          );
                          return (
                            <div>
                              <p className="font-bold text-[var(--color-navy)]">
                                {formatCurrency(converted, selectedCurrency)}
                              </p>
                              {isForeign && (
                                <p className="text-[10px] font-medium text-[var(--color-navy)]/50">
                                  Orig: {formatCurrency(Number(order.total || 0), order.currency || "USD")}
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* 6. Payment Status Column */}
                      <td className="px-5 py-3.5 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Paid · {methodLabel}
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            Failed · {methodLabel}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Pending · {methodLabel}
                          </span>
                        )}
                      </td>

                      {/* 7. Fulfillment Status Column */}
                      <td className="px-5 py-3.5 text-center">
                        {order.status === "DELIVERED" ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                            Delivered
                          </span>
                        ) : order.status === "SHIPPED" ? (
                          <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-800">
                            Shipped
                          </span>
                        ) : order.status === "PROCESSING" ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800">
                            Processing
                          </span>
                        ) : order.status === "CANCELLED" ? (
                          <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-800">
                            Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                            Unfulfilled
                          </span>
                        )}
                      </td>

                      {/* 8. Context Actions Menu */}
                      <td className="px-5 py-3.5 text-right relative">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="rounded-lg p-1.5 text-[var(--color-navy)]/60 hover:bg-[var(--color-sand)]/50 hover:text-[var(--color-navy)] transition-colors"
                            title="Open Order Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() =>
                              setActionMenuOpenId(actionMenuOpenId === order.id ? null : order.id)
                            }
                            className="rounded-lg p-1.5 text-[var(--color-navy)]/60 hover:bg-[var(--color-sand)]/50 hover:text-[var(--color-navy)] transition-colors"
                            title="Quick Actions"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Floating Action Menu Popover */}
                        {actionMenuOpenId === order.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-5 top-12 z-50 w-48 rounded-2xl border border-[var(--color-sand)] bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 text-left"
                          >
                            <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-navy)]/40 border-b border-slate-100">
                              Quick Change Status
                            </div>

                            <button
                              type="button"
                              onClick={() => handleQuickStatus(order.id, "PROCESSING")}
                              disabled={order.status === "PROCESSING"}
                              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-[var(--color-navy)] hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-40"
                            >
                              <Clock className="h-3.5 w-3.5 text-blue-600" />
                              <span>Mark Processing</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleQuickStatus(order.id, "SHIPPED")}
                              disabled={order.status === "SHIPPED"}
                              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-[var(--color-navy)] hover:bg-sky-50 hover:text-sky-700 transition-colors disabled:opacity-40"
                            >
                              <Truck className="h-3.5 w-3.5 text-sky-600" />
                              <span>Mark Shipped</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleQuickStatus(order.id, "DELIVERED")}
                              disabled={order.status === "DELIVERED"}
                              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-[var(--color-navy)] hover:bg-emerald-50 hover:text-emerald-700 transition-colors disabled:opacity-40"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Mark Delivered</span>
                            </button>

                            <div className="my-1 border-t border-slate-100" />

                            <button
                              type="button"
                              onClick={() => handleCopy(order.orderNumber, order.id)}
                              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-[var(--color-navy)] hover:bg-slate-100 transition-colors"
                            >
                              {copiedId === order.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-[var(--color-navy)]/60" />
                              )}
                              <span>{copiedId === order.id ? "Copied!" : "Copy Order #"}</span>
                            </button>

                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-[var(--color-navy)] hover:bg-slate-100 transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-[var(--color-navy)]/60" />
                              <span>View Full Details</span>
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: Pagination + Counter (Inspired by Confidency OS) */}
        <div className="flex flex-col gap-3 border-t border-[var(--color-sand)]/70 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between bg-white text-xs text-[var(--color-navy)]/65">
          <div>
            Showing{" "}
            <span className="font-bold text-[var(--color-navy)]">
              {filteredOrders.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-[var(--color-navy)]">
              {Math.min(currentPage * PAGE_SIZE, filteredOrders.length)}
            </span>{" "}
            of <span className="font-bold text-[var(--color-navy)]">{filteredOrders.length}</span>{" "}
            orders
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-sand)] bg-white text-[var(--color-navy)] disabled:opacity-30 hover:bg-[var(--color-sand)]/20 transition-all shadow-2xs"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                // Show first, last, and current +- 1
                return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
              })
              .map((pageNum, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && pageNum - prev > 1;

                return (
                  <span key={pageNum} className="inline-flex items-center gap-1">
                    {showEllipsis && <span className="px-1 text-slate-400">..</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                        currentPage === pageNum
                          ? "bg-[var(--color-navy)] text-white"
                          : "border border-[var(--color-sand)] bg-white text-[var(--color-navy)]/70 hover:bg-[var(--color-sand)]/20"
                      }`}
                    >
                      {pageNum}
                    </button>
                  </span>
                );
              })}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || filteredOrders.length === 0}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-sand)] bg-white text-[var(--color-navy)] disabled:opacity-30 hover:bg-[var(--color-sand)]/20 transition-all shadow-2xs"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
