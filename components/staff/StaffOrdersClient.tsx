"use client";

import { useState, useTransition } from "react";
import {
  Package,
  Search,
  Truck,
  CheckCircle,
  Clock,
  ArrowRight,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import { staffUpdateOrderStatus } from "@/app/staff/orders/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface StaffOrderRow {
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
  shippingCity?: string | null;
  shippingCountry?: string | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  items: {
    id: string;
    productName: string;
    size: string;
    color: string;
    quantity: number;
    price: number;
    imageUrl?: string;
  }[];
}

interface StaffOrdersClientProps {
  initialOrders: StaffOrderRow[];
}

export function StaffOrdersClient({ initialOrders }: StaffOrdersClientProps) {
  const [orders, setOrders] = useState<StaffOrderRow[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  // Ship Modal State
  const [shipModalOrder, setShipModalOrder] = useState<StaffOrderRow | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("DHL Express");
  const [shipNote, setShipNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.customerName.toLowerCase().includes(search.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "ALL") return true;
    if (statusFilter === "NEEDS_PROCESSING") {
      return order.status === "CONFIRMED";
    }
    return order.status === statusFilter;
  });

  const handleStartProcessing = (order: StaffOrderRow) => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await staffUpdateOrderStatus({
        orderId: order.id,
        status: "PROCESSING",
      });

      if (!res.success) {
        if (res.error === "Password change required" || (res as any).redirect) {
          window.location.href = "/staff/change-password";
          return;
        }
        setErrorMessage(res.error || "Failed to update order status");
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: "PROCESSING" } : o))
        );
      }
    });
  };

  const handleShipSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipModalOrder) return;
    if (!trackingNumber.trim()) {
      setErrorMessage("Tracking number is required to ship order.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const res = await staffUpdateOrderStatus({
        orderId: shipModalOrder.id,
        status: "SHIPPED",
        trackingNumber: trackingNumber.trim(),
        carrier: carrier.trim(),
        note: shipNote.trim() || undefined,
      });

      if (!res.success) {
        if (res.error === "Password change required" || (res as any).redirect) {
          window.location.href = "/staff/change-password";
          return;
        }
        setErrorMessage(res.error || "Failed to ship order");
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === shipModalOrder.id
              ? {
                  ...o,
                  status: "SHIPPED",
                  trackingNumber: trackingNumber.trim(),
                  carrier: carrier.trim(),
                }
              : o
          )
        );
        setShipModalOrder(null);
        setTrackingNumber("");
        setShipNote("");
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Ready to Pack
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Package className="w-3 h-3" /> Processing
          </span>
        );
      case "SHIPPED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Truck className="w-3 h-3" /> Shipped
          </span>
        );
      case "DELIVERED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle className="w-3 h-3" /> Delivered
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-navy)] flex items-center gap-2">
            <Package className="w-7 h-7 text-[var(--color-navy)]/80" />
            Order Fulfillment
          </h1>
          <p className="text-sm text-[var(--color-navy)]/60">
            Manage packing, tracking assignment, and shipping transitions
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-[var(--color-sand)] p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[var(--color-navy)]/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search order #, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--color-sand)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { label: "All Orders", value: "ALL" },
            { label: "Needs Packing", value: "NEEDS_PROCESSING" },
            { label: "Processing", value: "PROCESSING" },
            { label: "Shipped", value: "SHIPPED" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === tab.value
                  ? "bg-[var(--color-navy)] text-white shadow-sm"
                  : "bg-slate-100 text-[var(--color-navy)]/70 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--color-sand)] p-12 text-center text-sm text-[var(--color-navy)]/60">
            No orders match your filter criteria.
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl border border-[var(--color-sand)] shadow-sm p-5 hover:border-[var(--color-navy)]/30 transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-sand)]/60 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-base text-[var(--color-navy)]">
                    #{order.orderNumber}
                  </span>
                  {getStatusBadge(order.status)}
                </div>
                <div className="text-xs text-[var(--color-navy)]/60">
                  {new Date(order.createdAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              </div>

              {/* Customer & Items Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/50 mb-1">
                    Customer & Destination
                  </h4>
                  <p className="font-semibold text-[var(--color-navy)]">{order.customerName}</p>
                  <p className="text-xs text-[var(--color-navy)]/70">{order.customerEmail}</p>
                  <p className="text-xs text-[var(--color-navy)]/70 mt-1">
                    {[order.shippingCity, order.shippingCountry].filter(Boolean).join(", ") || "No address specified"}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/50 mb-1">
                    Items ({order.items.reduce((acc, i) => acc + i.quantity, 0)})
                  </h4>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-2 rounded-lg bg-[var(--color-cream)]/50 border border-[var(--color-sand)]/50"
                      >
                        <div className="flex items-center gap-2">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.productName}
                              className="w-10 h-10 object-cover rounded-md border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-slate-200 flex items-center justify-center text-xs text-slate-500">
                              IMG
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-xs text-[var(--color-navy)]">
                              {item.productName}
                            </p>
                            <p className="text-[11px] text-[var(--color-navy)]/60">
                              Size {item.size} • Color: {item.color}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[var(--color-navy)] px-2 py-0.5 rounded bg-white border">
                          Qty: {item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Shipping & Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--color-sand)]/60">
                <div>
                  {order.trackingNumber ? (
                    <div className="text-xs text-[var(--color-navy)]/80 flex items-center gap-1.5 font-medium">
                      <Truck className="w-4 h-4 text-emerald-600" />
                      Carrier: <span className="font-semibold">{order.carrier || "Standard"}</span> • Tracking:{" "}
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border">
                        {order.trackingNumber}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-[var(--color-navy)]/50 italic">
                      No tracking number assigned yet.
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {order.status === "CONFIRMED" && (
                    <button
                      onClick={() => handleStartProcessing(order)}
                      disabled={isPending}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                    >
                      <Package className="w-3.5 h-3.5" />
                      Start Processing
                    </button>
                  )}

                  {order.status === "PROCESSING" && (
                    <button
                      onClick={() => {
                        setShipModalOrder(order);
                        setTrackingNumber("");
                        setErrorMessage(null);
                      }}
                      disabled={isPending}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      Ship Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Ship Modal Dialog */}
      <Dialog open={!!shipModalOrder} onOpenChange={(open) => !open && setShipModalOrder(null)}>
        <DialogContent className="max-w-md bg-white border-[var(--color-sand)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--color-navy)] flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600" />
              Ship Order #{shipModalOrder?.orderNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--color-navy)]/60">
              Provide carrier tracking details. Transitioning to SHIPPED triggers a customer notification email.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleShipSubmit} className="space-y-4 mt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70 mb-1">
                Carrier Name
              </label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-sand)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20"
              >
                <option value="DHL Express">DHL Express</option>
                <option value="FedEx">FedEx</option>
                <option value="UPS">UPS</option>
                <option value="Local Courier">Local Courier</option>
                <option value="Standard Postal">Standard Postal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70 mb-1">
                Tracking Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. TRK123456789"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-sand)] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70 mb-1">
                Optional Fulfillment Note
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Dispatched from main warehouse hub"
                value={shipNote}
                onChange={(e) => setShipNote(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-sand)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShipModalOrder(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-[var(--color-sand)] text-[var(--color-navy)]/70 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isPending ? "Confirming..." : "Confirm Shipment"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
