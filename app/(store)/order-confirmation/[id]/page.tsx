"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Printer,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/constants/currencies";
import { useCartStore } from "@/stores/cart-store";

interface OrderItemData {
  id: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  product?: {
    slug: string;
    images: { url: string }[];
  } | null;
}

interface OrderAddressData {
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
}

interface OrderStatusData {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  paymentMethod: "STRIPE" | "KHALTI" | "COD" | string;
  subtotal?: number;
  shipping?: number;
  tax?: number;
  discount?: number;
  total: number;
  currency: string;
  createdAt: string;
  address?: OrderAddressData | null;
  items?: OrderItemData[];
}

export default function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const [order, setOrder] = useState<OrderStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Clear local cart drawer when order is completed
  useEffect(() => {
    if (order && (order.paymentStatus === "PAID" || order.paymentMethod === "COD")) {
      useCartStore.getState().clearCart();
    }
  }, [order?.paymentStatus, order?.paymentMethod]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let isCancelled = false;

    async function checkStatus() {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Order not found.");
            setLoading(false);
            return;
          }
          throw new Error("Failed to fetch order status");
        }

        const data = await res.json();
        if (!isCancelled && data.order) {
          setOrder(data.order);
          setLoading(false);

          // Stop polling if order reached terminal payment state
          if (
            data.order.paymentStatus === "PAID" ||
            data.order.paymentStatus === "FAILED" ||
            data.order.paymentMethod === "COD"
          ) {
            if (intervalId) clearInterval(intervalId);
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || "Failed to query status");
          setLoading(false);
        }
      }
    }

    // Initial check
    checkStatus();

    // Poll every 2.5s for pending payments (up to 15 intervals = ~37s)
    let count = 0;
    intervalId = setInterval(() => {
      count++;
      if (count >= 15) {
        if (intervalId) clearInterval(intervalId);
        return;
      }
      checkStatus();
    }, 2500);

    return () => {
      isCancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [orderId]);

  function copyOrderNumber() {
    if (!order?.orderNumber) return;
    navigator.clipboard.writeText(order.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <RefreshCw className="h-10 w-10 animate-spin text-[var(--color-navy)]/60 mb-4" />
        <h2 className="text-xl font-bold text-[var(--color-navy)]">
          Retrieving Order Details...
        </h2>
        <p className="mt-2 text-sm text-[var(--color-navy)]/60">
          Communicating with order management system.
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <AlertCircle className="h-12 w-12 text-rose-600 mb-4" />
        <h2 className="text-2xl font-bold text-[var(--color-navy)]">
          Unable to Find Order
        </h2>
        <p className="mt-2 text-sm text-[var(--color-navy)]/60">
          {error || "The requested order identifier is invalid."}
        </p>
        <Link href="/shop" className="mt-6">
          <Button className="rounded-xl bg-[var(--color-navy)] text-white px-6">
            Return to Store
          </Button>
        </Link>
      </div>
    );
  }

  const isPending = order.paymentStatus === "PENDING" && order.paymentMethod !== "COD";
  const isPaid = order.paymentStatus === "PAID";
  const isFailed = order.paymentStatus === "FAILED";
  const isCod = order.paymentMethod === "COD";

  const paymentMethodLabel =
    order.paymentMethod === "STRIPE"
      ? "Credit / Debit Card (Stripe)"
      : order.paymentMethod === "KHALTI"
      ? "Khalti ePayment (v2)"
      : "Cash on Delivery (COD)";

  return (
    <div className="min-h-screen bg-[var(--color-cream)] py-12 px-4 md:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Status Card */}
        <div className="rounded-3xl border border-[var(--color-sand)] bg-white p-6 md:p-10 shadow-sm text-center">
          {/* Header Icon */}
          <div className="mb-6 flex justify-center">
            {isPaid || isCod ? (
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
                <CheckCircle2 className="h-10 w-10" />
              </div>
            ) : isPending ? (
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-50 text-amber-600 ring-8 ring-amber-50/50 animate-pulse">
                <Clock className="h-10 w-10" />
              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 text-rose-600 ring-8 ring-rose-50/50">
                <AlertCircle className="h-10 w-10" />
              </div>
            )}
          </div>

          {/* Heading and Description */}
          {isPaid && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3">
                <ShieldCheck className="h-3.5 w-3.5" /> Payment Verified
              </span>
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--color-navy)] md:text-4xl">
                Thank You for Your Order!
              </h1>
              <p className="mt-2 text-sm text-[var(--color-navy)]/70">
                {order.paymentMethod === "KHALTI"
                  ? "Your payment has been successfully authorized and confirmed via Khalti."
                  : order.paymentMethod === "STRIPE"
                  ? "Your payment has been successfully authorized and confirmed via Stripe."
                  : "Your payment has been successfully authorized and confirmed."}
              </p>
            </>
          )}

          {isCod && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3.5 py-1 text-xs font-bold text-blue-800 uppercase tracking-wider mb-3">
                <Truck className="h-3.5 w-3.5" /> Cash on Delivery
              </span>
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--color-navy)] md:text-4xl">
                Order Placed Successfully!
              </h1>
              <p className="mt-2 text-sm text-[var(--color-navy)]/70">
                Our logistics team will verify your address and prepare your shipment. Please have exact cash ready at delivery.
              </p>
            </>
          )}

          {isPending && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1 text-xs font-bold text-amber-800 uppercase tracking-wider mb-3">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Verifying Payment Status
              </span>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--color-navy)] md:text-3xl">
                Finalizing Payment...
              </h1>
              <p className="mt-2 text-sm text-[var(--color-navy)]/70">
                We are receiving the confirmation from the payment provider. This page will update automatically once verified.
              </p>
            </>
          )}

          {isFailed && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3.5 py-1 text-xs font-bold text-rose-800 uppercase tracking-wider mb-3">
                Payment Failed
              </span>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--color-navy)] md:text-3xl">
                Payment Could Not Be Completed
              </h1>
              <p className="mt-2 text-sm text-[var(--color-navy)]/70">
                Your payment provider declined the transaction. No funds were captured, and reserved items have been restored.
              </p>
            </>
          )}

          {/* Key Details Card */}
          <div className="mt-8 rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream)]/40 p-5 text-left text-sm space-y-3">
            <div className="flex justify-between items-center border-b border-[var(--color-sand)]/60 pb-2.5">
              <span className="text-[var(--color-navy)]/60 font-medium">Order Number</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[var(--color-navy)]">
                  {order.orderNumber}
                </span>
                <button
                  type="button"
                  onClick={copyOrderNumber}
                  className="rounded p-1 text-[var(--color-navy)]/50 hover:bg-[var(--color-sand)]/60 hover:text-[var(--color-navy)] transition-colors"
                  aria-label="Copy order number"
                  title="Copy order number"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center border-b border-[var(--color-sand)]/60 pb-2.5">
              <span className="text-[var(--color-navy)]/60 font-medium">Payment Method</span>
              <span className="font-semibold text-[var(--color-navy)] uppercase text-xs">
                {paymentMethodLabel}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-[var(--color-sand)]/60 pb-2.5">
              <span className="text-[var(--color-navy)]/60 font-medium">Payment Status</span>
              <span
                className={`font-bold ${
                  isPaid
                    ? "text-emerald-600"
                    : isFailed
                    ? "text-rose-600"
                    : "text-amber-600"
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>

            <div className="flex justify-between items-center pt-1 text-base">
              <span className="font-bold text-[var(--color-navy)]">Total Amount</span>
              <span className="font-bold text-[var(--color-navy)]">
                {formatCurrency(Number(order.total), order.currency)}
              </span>
            </div>
          </div>

          {/* Purchased Items List */}
          {order.items && order.items.length > 0 && (
            <div className="mt-6 rounded-2xl border border-[var(--color-sand)] bg-white p-5 text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)] mb-3">
                Order Items ({order.items.reduce((acc, i) => acc + i.quantity, 0)})
              </h3>
              <div className="divide-y divide-[var(--color-sand)]/60">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-[var(--color-sand)] bg-[var(--color-cream-alt)]">
                      <Image
                        src={item.product?.images?.[0]?.url || "/placeholder-shoe.png"}
                        alt={item.productName}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-[var(--color-navy)] truncate">
                        {item.productName}
                      </h4>
                      <p className="text-xs text-[var(--color-navy)]/60">
                        Size: {item.size} · Color: {item.color} · Qty: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right text-sm font-bold text-[var(--color-navy)]">
                      {formatCurrency(Number(item.price) * item.quantity, order.currency)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shipping Address */}
          {order.address && (
            <div className="mt-4 rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream)]/30 p-4 text-left text-xs space-y-1">
              <span className="font-bold uppercase tracking-wider text-[var(--color-navy)]/70 text-[10px] block mb-1">
                Delivery Address
              </span>
              <p className="font-semibold text-[var(--color-navy)] text-sm">{order.address.fullName}</p>
              <p className="text-[var(--color-navy)]/70">
                {order.address.line1}
                {order.address.line2 ? `, ${order.address.line2}` : ""}
              </p>
              <p className="text-[var(--color-navy)]/70">
                {order.address.city}, {order.address.state} {order.address.postalCode}, {order.address.country}
              </p>
              {order.address.phone && (
                <p className="text-[var(--color-navy)]/60 pt-0.5">Phone: {order.address.phone}</p>
              )}
            </div>
          )}

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            {isFailed ? (
              <Link href="/checkout">
                <Button className="h-11 w-full sm:w-auto rounded-lg bg-[var(--color-navy)] px-6 font-semibold text-white">
                  Retry Checkout
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/shop">
                  <Button className="h-11 w-full sm:w-auto rounded-lg bg-[var(--color-navy)] px-6 font-semibold text-white flex items-center justify-center gap-2">
                    Continue Shopping
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.print()}
                  className="h-11 w-full sm:w-auto rounded-lg border-[var(--color-sand)] text-[var(--color-navy)] font-semibold flex items-center justify-center gap-2 hover:bg-[var(--color-sand)]/40"
                >
                  <Printer className="h-4 w-4" />
                  Print Invoice
                </Button>

                <Link href={`/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}`}>
                  <Button
                    variant="outline"
                    className="h-11 w-full sm:w-auto rounded-lg border-[var(--color-sand)] text-[var(--color-navy)] font-semibold flex items-center justify-center gap-2 hover:bg-[var(--color-sand)]/40"
                  >
                    <Truck className="h-4 w-4" />
                    Track Order
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

