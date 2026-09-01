"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Truck, CheckCircle2, Clock, AlertCircle } from "lucide-react";

function formatDate(dateString?: string | null) {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
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
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    const cleanOrderNumber = orderNumber.trim();
    const cleanEmail = email.trim();

    try {
      const res = await fetch(
        `/api/orders/track?orderNumber=${encodeURIComponent(cleanOrderNumber)}&email=${encodeURIComponent(cleanEmail)}`
      );

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned an invalid response. Please try again.");
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Order not found");
        return;
      }

      setResult(data.order);
    } catch (err: any) {
      console.error("[Track Order Fetch Error]:", err);
      setError(err?.message || "Failed to fetch order details. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "DELIVERED":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "SHIPPED":
        return "bg-sky-100 text-sky-800 border-sky-200";
      case "PROCESSING":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "CANCELLED":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)] py-12 md:py-16">
      <div className="mx-auto max-w-2xl px-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-sand)]/60 text-[var(--color-navy)]">
            <Truck className="h-6 w-6" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)] md:text-4xl">
            Track Your Order
          </h1>
          <p className="mt-2 text-sm text-[var(--color-navy)]/65">
            Enter your order number and email address to view current status and updates.
          </p>
        </div>

        {/* Search Form */}
        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-[var(--color-sand)] bg-white/80 p-6 shadow-sm backdrop-blur-sm space-y-4"
        >
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70">
              Order Number
            </label>
            <Input
              placeholder="e.g. SH-12345"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              required
              className="h-12 rounded-xl border-[var(--color-sand)] bg-white px-4 text-sm text-[var(--color-navy)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70">
              Email Address
            </label>
            <Input
              type="email"
              placeholder="The email used at checkout"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-xl border-[var(--color-sand)] bg-white px-4 text-sm text-[var(--color-navy)]"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !orderNumber.trim() || !email.trim()}
            className="h-12 w-full rounded-xl bg-[var(--color-navy)] font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 animate-spin" /> Searching...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4" /> Track Order
              </span>
            )}
          </Button>
        </form>

        {/* Order Details Result */}
        {result && (
          <div className="mt-8 rounded-2xl border border-[var(--color-sand)] bg-white p-6 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-sand)]/60 pb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-navy)]/55">
                  Order Details
                </span>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-navy)]">
                  {result.orderNumber}
                </h2>
                {result.createdAt && (
                  <p className="text-xs text-[var(--color-navy)]/60 mt-0.5">
                    Placed on {formatDate(result.createdAt)}
                  </p>
                )}
              </div>

              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getStatusColor(
                  result.status
                )}`}
              >
                {result.status}
              </span>
            </div>

            {/* Status History Timeline */}
            {result.statusHistory && result.statusHistory.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70">
                  Status History
                </h3>
                <div className="space-y-2">
                  {result.statusHistory.map((sh: any) => (
                    <div
                      key={sh.id}
                      className="flex items-start gap-3 rounded-xl border border-[var(--color-sand)]/40 bg-[var(--color-cream-alt)]/50 p-3 text-xs"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <div className="flex-1">
                        <p className="font-bold text-[var(--color-navy)]">{sh.status}</p>
                        {sh.note && <p className="text-[var(--color-navy)]/70 mt-0.5">{sh.note}</p>}
                      </div>
                      <span className="text-[10px] text-[var(--color-navy)]/50">
                        {formatDateTime(sh.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70">
                Items ({result.items?.length || 0})
              </h3>
              <div className="divide-y divide-[var(--color-sand)]/50">
                {result.items?.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-navy)]">
                        {item.productName}
                      </p>
                      <p className="text-xs text-[var(--color-navy)]/60">
                        Size: {item.size} | Color: {item.color} | Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[var(--color-navy)]">
                      ${(Number(item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Breakdown */}
            <div className="border-t border-[var(--color-sand)]/60 pt-4 space-y-2 text-sm text-[var(--color-navy)]">
              <div className="flex justify-between text-[var(--color-navy)]/70">
                <span>Subtotal</span>
                <span>${Number(result.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[var(--color-navy)]/70">
                <span>Shipping</span>
                <span>${Number(result.shipping || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-[var(--color-sand)]/60 pt-2">
                <span>Total Amount</span>
                <span>${Number(result.total || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}