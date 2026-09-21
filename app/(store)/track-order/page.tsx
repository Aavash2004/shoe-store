"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Package,
  MapPin,
  Copy,
  Check,
  Printer,
  HelpCircle,
  ArrowLeft,
  ShieldCheck,
  Calendar,
  Sparkles,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { formatCurrency } from "@/lib/constants/currencies";

function formatDate(dateString?: string | null) {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString || "";
  }
}

function formatDateTime(dateString?: string | null) {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateString || "";
  }
}

function getEstimatedDelivery(createdAt?: string | null, status?: string) {
  if (!createdAt) return "3–5 Business Days";
  try {
    const created = new Date(createdAt);
    if (isNaN(created.getTime())) return "3–5 Business Days";

    if (status === "DELIVERED") {
      return `Delivered on ${formatDate(createdAt)}`;
    }

    // Standard shipping: +4 business days from order creation
    const est = new Date(created);
    est.setDate(est.getDate() + 4);

    return est.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "3–5 Business Days";
  }
}

function maskEmail(emailStr?: string | null) {
  if (!emailStr) return "";
  const parts = emailStr.split("@");
  if (parts.length !== 2) return emailStr;
  const name = parts[0];
  const domain = parts[1];
  const maskedName =
    name.length > 2
      ? `${name[0]}${"*".repeat(Math.min(name.length - 2, 5))}${name[name.length - 1]}`
      : `${name[0]}*`;
  return `${maskedName}@${domain}`;
}

const MILESTONES = [
  { id: "confirmed", label: "Order Confirmed", desc: "Order details received & verified" },
  { id: "processing", label: "Processing", desc: "Packed & quality inspected" },
  { id: "shipped", label: "Shipped", desc: "In transit with regional courier" },
  { id: "out_for_delivery", label: "Out for Delivery", desc: "Loaded onto local courier vehicle" },
  { id: "delivered", label: "Delivered", desc: "Package delivered to doorstep" },
];

function getMilestoneIndex(status?: string, notes?: string): number {
  const s = (status || "").toUpperCase();
  const n = (notes || "").toLowerCase();

  if (s === "DELIVERED") return 4;
  if (s === "SHIPPED") {
    if (n.includes("out for delivery") || n.includes("local courier") || n.includes("courier")) {
      return 3;
    }
    return 2;
  }
  if (s === "PROCESSING") return 1;
  return 0; // PENDING or default
}

function TrackOrderInner() {
  const searchParams = useSearchParams();
  const initialOrderNumber = searchParams.get("orderNumber") || searchParams.get("order") || "";
  const initialEmail = searchParams.get("email") || "";

  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [email, setEmail] = useState(initialEmail);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchOrder = useCallback(async (num: string, mail: string) => {
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/orders/track?orderNumber=${encodeURIComponent(num.trim())}&email=${encodeURIComponent(
          mail.trim()
        )}`
      );

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned an invalid response. Please try again.");
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Order not found. Please verify your details.");
        return;
      }

      setResult(data.order);
    } catch (err: any) {
      console.error("[Track Order Fetch Error]:", err);
      setError(err?.message || "Failed to fetch order details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch if both orderNumber & email are provided in URL query parameters
  useEffect(() => {
    if (initialOrderNumber && initialEmail) {
      fetchOrder(initialOrderNumber, initialEmail);
    }
  }, [initialOrderNumber, initialEmail, fetchOrder]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) return;
    fetchOrder(orderNumber, email);
  }

  function handleCopyOrderNumber() {
    if (!result?.orderNumber) return;
    navigator.clipboard.writeText(result.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const activeMilestone = result
    ? getMilestoneIndex(
        result.status,
        result.statusHistory?.[result.statusHistory.length - 1]?.note
      )
    : 0;

  const isCancelled = result?.status === "CANCELLED";

  return (
    <div className="min-h-screen bg-[var(--color-cream)] py-10 md:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Search View: When No Order is Loaded */}
        {!result && (
          <div className="mx-auto max-w-xl">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-sand)]/70 text-[var(--color-navy)] shadow-inner">
                <Truck className="h-7 w-7" />
              </div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--color-navy)] md:text-4xl">
                Track Your Shipment
              </h1>
              <p className="mt-2.5 text-sm text-[var(--color-navy)]/65">
                Check live milestone updates, delivery dates, and package status for your shoe order.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-8 rounded-3xl border border-[var(--color-sand)] bg-white/90 p-6 sm:p-8 shadow-md backdrop-blur-md space-y-5"
            >
              {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-700 animate-in fade-in">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" />
                  <div className="flex-1">
                    <p className="font-semibold">Unable to locate shipment</p>
                    <p className="text-xs text-rose-600/90 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70">
                  Order Number
                </label>
                <Input
                  placeholder="e.g. SH-12345 or ORD-98210"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                  required
                  className="h-12 rounded-xl border-[var(--color-sand)] bg-white px-4 font-mono text-sm tracking-wide text-[var(--color-navy)] placeholder:font-sans focus-visible:ring-2 focus-visible:ring-[var(--color-navy)]"
                />
                <p className="text-[11px] text-[var(--color-navy)]/50">
                  Found in your order confirmation email or receipt.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl border-[var(--color-sand)] bg-white px-4 text-sm text-[var(--color-navy)] focus-visible:ring-2 focus-visible:ring-[var(--color-navy)]"
                />
                <p className="text-[11px] text-[var(--color-navy)]/50">
                  The email address provided during checkout.
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading || !orderNumber.trim() || !email.trim()}
                className="h-12 w-full rounded-xl bg-[var(--color-navy)] font-semibold text-[var(--color-cream)] hover:bg-[var(--color-navy)]/90 disabled:opacity-50 transition-all shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" /> Retrieving Shipment...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Track Package
                  </span>
                )}
              </Button>
            </form>
          </div>
        )}

        {/* Loaded Order Tracking Dashboard */}
        {result && (
          <div className="space-y-6">
            {/* Top Bar Navigation & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setResult(null)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-navy)]/70 hover:text-[var(--color-navy)] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Track another order
              </button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="h-9 gap-1.5 rounded-xl border-[var(--color-sand)] bg-white text-xs font-medium text-[var(--color-navy)] hover:bg-[var(--color-sand)]/30"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Receipt
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-9 gap-1.5 rounded-xl border-[var(--color-sand)] bg-white text-xs font-medium text-[var(--color-navy)] hover:bg-[var(--color-sand)]/30"
                >
                  <a
                    href={`mailto:support@shoestore.com?subject=Inquiry regarding Order ${result.orderNumber}`}
                  >
                    <HelpCircle className="h-3.5 w-3.5" /> Need Help?
                  </a>
                </Button>
              </div>
            </div>

            {/* Hero Estimated Delivery Card */}
            <div className="overflow-hidden rounded-3xl border border-[var(--color-sand)] bg-white shadow-md">
              <div className="bg-gradient-to-r from-[var(--color-navy)] to-[var(--color-navy)]/90 px-6 py-8 text-[var(--color-cream)] sm:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      {isCancelled ? "Order Status" : "Estimated Delivery"}
                    </span>
                    <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-3xl text-white">
                      {isCancelled
                        ? "Order Cancelled"
                        : getEstimatedDelivery(result.createdAt, result.status)}
                    </h2>
                    <p className="mt-1 text-xs text-white/70">
                      {isCancelled
                        ? "This order has been cancelled and refunded."
                        : `Standard Express Delivery · Carrier dispatch on schedule`}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-start sm:items-end justify-between gap-2 border-t border-white/10 pt-4 sm:border-0 sm:pt-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold tracking-wider text-white">
                        {result.orderNumber}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyOrderNumber}
                        className="rounded-lg bg-white/20 p-1.5 text-white/80 hover:bg-white/30 hover:text-white transition-colors"
                        title="Copy Order Number"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-300" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    {result.createdAt && (
                      <span className="text-[11px] text-white/60">
                        Placed on {formatDate(result.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Visual Synchronized Progress Stepper */}
              {!isCancelled ? (
                <div className="p-6 sm:p-8">
                  <div className="relative">
                    {/* Background track line */}
                    <div className="absolute left-0 top-5 hidden h-1 w-full bg-[var(--color-sand)]/70 md:block" />

                    {/* Active progress fill line */}
                    <div
                      className="absolute left-0 top-5 hidden h-1 bg-emerald-600 transition-all duration-500 md:block"
                      style={{
                        width: `${(activeMilestone / (MILESTONES.length - 1)) * 100}%`,
                      }}
                    />

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-5 md:gap-2">
                      {MILESTONES.map((step, idx) => {
                        const isCompleted = idx < activeMilestone;
                        const isCurrent = idx === activeMilestone;

                        return (
                          <div
                            key={step.id}
                            className="relative flex items-start gap-4 md:flex-col md:items-center md:text-center"
                          >
                            {/* Milestone Icon Node */}
                            <div
                              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                                isCompleted
                                  ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                                  : isCurrent
                                  ? "border-[var(--color-navy)] bg-white text-[var(--color-navy)] ring-4 ring-[var(--color-navy)]/15 shadow-md"
                                  : "border-[var(--color-sand)] bg-white text-[var(--color-navy)]/30"
                              }`}
                            >
                              {isCompleted ? (
                                <Check className="h-5 w-5 stroke-[2.5]" />
                              ) : isCurrent ? (
                                <span className="h-3 w-3 rounded-full bg-[var(--color-navy)] animate-pulse" />
                              ) : (
                                <span className="text-xs font-bold">{idx + 1}</span>
                              )}
                            </div>

                            {/* Milestone Labels */}
                            <div className="min-w-0">
                              <p
                                className={`text-xs font-bold leading-snug ${
                                  isCurrent
                                    ? "text-[var(--color-navy)] font-extrabold"
                                    : isCompleted
                                    ? "text-emerald-800"
                                    : "text-[var(--color-navy)]/40"
                                }`}
                              >
                                {step.label}
                              </p>
                              <p className="mt-0.5 text-[11px] text-[var(--color-navy)]/60 leading-tight">
                                {step.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-bold text-rose-700">
                    <AlertCircle className="h-4 w-4" /> This order has been cancelled
                  </span>
                </div>
              )}
            </div>

            {/* Main Content Grid: Items (Left) + Details/Summary (Right) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left Column: Shipment Items & Activity Feed */}
              <div className="space-y-6 lg:col-span-2">
                {/* Items in Package */}
                <div className="rounded-3xl border border-[var(--color-sand)] bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--color-sand)]/60 pb-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-[var(--color-navy)]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">
                        Items in Shipment ({result.items?.length || 0})
                      </h3>
                    </div>
                    <span className="text-xs font-medium text-[var(--color-navy)]/60">
                      Standard Package
                    </span>
                  </div>

                  <div className="divide-y divide-[var(--color-sand)]/50">
                    {result.items?.map((item: any) => {
                      const imgUrl =
                        item.variant?.product?.images?.[0]?.url ||
                        item.image ||
                        "";
                      const slug = item.variant?.product?.slug;

                      return (
                        <div key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                          {/* Product Image */}
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--color-sand)]/70 bg-[var(--color-cream-alt)]">
                            {imgUrl ? (
                              <Image
                                src={imgUrl}
                                alt={item.productName || "Shoe item"}
                                fill
                                sizes="80px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[var(--color-navy)]/40">
                                Shoes
                              </div>
                            )}
                          </div>

                          {/* Product Details */}
                          <div className="flex-1 min-w-0">
                            {slug ? (
                              <Link
                                href={`/products/${slug}`}
                                className="font-semibold text-sm text-[var(--color-navy)] hover:underline truncate block"
                              >
                                {item.productName}
                              </Link>
                            ) : (
                              <p className="font-semibold text-sm text-[var(--color-navy)] truncate">
                                {item.productName}
                              </p>
                            )}

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-navy)]/70">
                              <span className="inline-flex items-center rounded-md bg-[var(--color-sand)]/50 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-navy)]">
                                Size: {item.size}
                              </span>
                              {item.color && (
                                <span className="inline-flex items-center rounded-md bg-[var(--color-sand)]/50 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-navy)]">
                                  Color: {item.color}
                                </span>
                              )}
                              <span>Qty: {item.quantity}</span>
                            </div>

                            <p className="mt-1.5 text-xs font-bold text-[var(--color-navy)]">
                              {formatCurrency(
                                Number(item.price || 0) * (item.quantity || 1),
                                result.currency || "USD"
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Granular Tracking Activity Log */}
                <div className="rounded-3xl border border-[var(--color-sand)] bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-[var(--color-sand)]/60 pb-4">
                    <Clock className="h-4 w-4 text-[var(--color-navy)]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">
                      Shipment Activity History
                    </h3>
                  </div>

                  {result.statusHistory && result.statusHistory.length > 0 ? (
                    <div className="space-y-3">
                      {result.statusHistory.map((sh: any, index: number) => {
                        const isLatest = index === result.statusHistory.length - 1;

                        return (
                          <div
                            key={sh.id || index}
                            className={`flex items-start gap-3 rounded-2xl border p-3.5 text-xs transition-all ${
                              isLatest
                                ? "border-[var(--color-sand)] bg-[var(--color-cream-alt)]/60 shadow-xs"
                                : "border-slate-100 bg-slate-50/50"
                            }`}
                          >
                            <CheckCircle2
                              className={`mt-0.5 h-4 w-4 shrink-0 ${
                                isLatest ? "text-emerald-600" : "text-slate-400"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-[var(--color-navy)]">{sh.status}</p>
                                <span className="text-[10px] text-[var(--color-navy)]/50 whitespace-nowrap">
                                  {formatDateTime(sh.createdAt)}
                                </span>
                              </div>
                              {sh.note && (
                                <p className="mt-1 text-xs text-[var(--color-navy)]/70">
                                  {sh.note}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-sand)]/40 bg-[var(--color-cream-alt)]/40 p-4 text-xs text-[var(--color-navy)]/70">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-semibold text-[var(--color-navy)]">
                          Order Successfully Received
                        </p>
                        <p className="text-[11px] text-[var(--color-navy)]/60 mt-0.5">
                          We are currently processing and preparing your shipment at our fulfillment center.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Destination Address & Summary */}
              <div className="space-y-6">
                {/* Delivering To Destination Card */}
                <div className="rounded-3xl border border-[var(--color-sand)] bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-[var(--color-sand)]/60 pb-3">
                    <MapPin className="h-4 w-4 text-[var(--color-navy)]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">
                      Delivering To
                    </h3>
                  </div>

                  {result.address ? (
                    <div className="space-y-1.5 text-xs text-[var(--color-navy)]/80">
                      <p className="font-bold text-sm text-[var(--color-navy)]">
                        {result.address.fullName || result.guestName || result.user?.name || "Recipient"}
                      </p>
                      <p>{result.address.line1}</p>
                      {result.address.line2 && <p>{result.address.line2}</p>}
                      <p>
                        {result.address.city}, {result.address.state} {result.address.postalCode}
                      </p>
                      <p className="font-medium text-[var(--color-navy)]/60">
                        {result.address.country}
                      </p>
                      {result.address.phone && (
                        <p className="text-[11px] text-[var(--color-navy)]/60 pt-1">
                          Phone: {result.address.phone}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--color-navy)]/60">
                      Standard Shipping Address on file
                    </p>
                  )}

                  <div className="border-t border-[var(--color-sand)]/60 pt-3 text-[11px] text-[var(--color-navy)]/60">
                    <p className="font-semibold text-[var(--color-navy)]">Notifications Email</p>
                    <p className="font-mono mt-0.5">
                      {maskEmail(result.guestEmail || result.user?.email)}
                    </p>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="rounded-3xl border border-[var(--color-sand)] bg-white p-6 shadow-sm space-y-3 text-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)] border-b border-[var(--color-sand)]/60 pb-3">
                    Payment Summary
                  </h3>

                  <div className="flex justify-between text-[var(--color-navy)]/70">
                    <span>Subtotal</span>
                    <span>
                      {formatCurrency(Number(result.subtotal || 0), result.currency || "USD")}
                    </span>
                  </div>

                  <div className="flex justify-between text-[var(--color-navy)]/70">
                    <span>Shipping</span>
                    <span>
                      {Number(result.shipping || 0) === 0
                        ? "FREE"
                        : formatCurrency(Number(result.shipping || 0), result.currency || "USD")}
                    </span>
                  </div>

                  {Number(result.tax || 0) > 0 && (
                    <div className="flex justify-between text-[var(--color-navy)]/70">
                      <span>Estimated Tax</span>
                      <span>
                        {formatCurrency(Number(result.tax || 0), result.currency || "USD")}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-[var(--color-sand)]/60 pt-3 text-sm font-bold text-[var(--color-navy)]">
                    <span>Total Paid</span>
                    <span>
                      {formatCurrency(Number(result.total || 0), result.currency || "USD")}
                    </span>
                  </div>

                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <ShieldCheck className="h-3 w-3" /> Payment Verified
                    </span>
                  </div>
                </div>

                {/* Return Guarantee Card */}
                <div className="rounded-3xl border border-[var(--color-sand)]/70 bg-[var(--color-cream-alt)]/60 p-5 text-xs text-[var(--color-navy)]/70 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-[var(--color-navy)]">
                    <ShieldCheck className="h-4 w-4 text-emerald-700" />
                    <span>30-Day Return Guarantee</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Try your shoes on carpet. If they don&apos;t fit perfectly, return or exchange them within 30 days of delivery.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-cream)] flex items-center justify-center py-24">
          <div className="flex items-center gap-3 text-sm font-semibold text-[var(--color-navy)]/60">
            <Clock className="h-5 w-5 animate-spin text-[var(--color-navy)]" />
            Loading tracking portal...
          </div>
        </div>
      }
    >
      <TrackOrderInner />
    </Suspense>
  );
}