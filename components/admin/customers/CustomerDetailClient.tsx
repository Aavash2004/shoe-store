"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Copy,
  Check,
  Phone,
  MessageCircle,
  ExternalLink,
  Crown,
  BadgeCheck,
  Package,
  ShoppingCart,
  Heart,
  Star,
  Compass,
  Trash2,
  Clock,
  Plus,
  MoreVertical,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Ban,
  CheckCircle2,
  UserCheck,
  Footprints,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  toggleCustomerBlock,
  updateCustomerRole,
  addCustomerNote,
  deleteCustomerNote,
} from "@/app/admin/customers/actions";
import { CustomerPhoneActions } from "@/components/admin/customers/CustomerPhoneActions";

export type CustomerDetailData = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
  lastLogin?: string | null;
  isBlocked?: boolean;
  isVip?: boolean;
  kpis: {
    totalSpent: number;
    ordersCompleted: number;
    ordersTotal: number;
    avgOrderValue: number;
    lastOrderDate: string | null;
    lastOrderRelative: string | null;
    returnRate: number;
    codRefusalsCount: number;
  };
  orders: {
    id: string;
    orderNumber: string;
    createdAt: string;
    itemsCount: number;
    total: number;
    currency: string;
    paymentMethod: string;
    paymentStatus: string;
    status: string;
    trackingNumber?: string | null;
  }[];
  intent: {
    cartItemsCount: number;
    cartTotal: number;
    cartUpdated: string | null;
    wishlistCount: number;
    wishlistSneakers: { id: string; name: string; image: string }[];
    reviewsCount: number;
    avgRating: number;
    reviewsList: { id: string; productName: string; rating: number; comment?: string | null }[];
    favoriteCategory: string;
    preferredSize: string;
  };
  addresses: {
    id: string;
    title: string;
    fullName: string;
    phone: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    country: string;
    isDefault: boolean;
  }[];
  notes: {
    id: string;
    content: string;
    authorName: string;
    createdAt: string;
  }[];
  activityLogs: {
    id: string;
    title: string;
    timestamp: string;
    actor: string;
    color: string;
  }[];
};

interface CustomerDetailClientProps {
  customer: CustomerDetailData;
}

export function CustomerDetailClient({ customer }: CustomerDetailClientProps) {
  const [isBlocked, setIsBlocked] = useState(Boolean(customer.isBlocked));
  const [role, setRole] = useState(customer.role);
  const [notes, setNotes] = useState(customer.notes);
  const [newNoteText, setNewNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals & Menu States
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedNewRole, setSelectedNewRole] = useState(customer.role);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Filters for Orders Table
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [orderSortBy, setOrderSortBy] = useState("NEWEST");

  const [isPending, startTransition] = useTransition();

  // Avatar initials
  const initials = useMemo(() => {
    if (!customer.name) return customer.email.slice(0, 2).toUpperCase();
    return customer.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [customer.name, customer.email]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle Block status
  const handleToggleBlock = () => {
    const nextState = !isBlocked;
    startTransition(async () => {
      setIsBlocked(nextState);
      const res = await toggleCustomerBlock(customer.id, nextState);
      if (!res.success) {
        setIsBlocked(!nextState);
        alert(res.error || "Failed to update status");
      }
    });
  };

  // Save new role
  const handleSaveRole = () => {
    startTransition(async () => {
      const res = await updateCustomerRole(customer.id, selectedNewRole as any);
      if (res.success) {
        setRole(selectedNewRole);
        setShowRoleDialog(false);
      } else {
        alert(res.error || "Failed to update role");
      }
    });
  };

  // Add Note
  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    startTransition(async () => {
      const res = await addCustomerNote(customer.id, newNoteText);
      if (res.success && res.note) {
        setNotes([res.note, ...notes]);
        setNewNoteText("");
        setIsAddingNote(false);
      } else {
        alert(res.error || "Failed to add note");
      }
    });
  };

  // Delete Note
  const handleDeleteNote = (noteId: string) => {
    startTransition(async () => {
      setNotes(notes.filter((n) => n.id !== noteId));
      const res = await deleteCustomerNote(noteId, customer.id);
      if (!res.success) {
        alert("Failed to delete note");
      }
    });
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return customer.orders
      .filter((o) => {
        if (orderStatusFilter === "ALL") return true;
        return o.status.toUpperCase() === orderStatusFilter.toUpperCase();
      })
      .sort((a, b) => {
        if (orderSortBy === "NEWEST") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (orderSortBy === "OLDEST") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (orderSortBy === "HIGHEST") {
          return b.total - a.total;
        }
        return 0;
      });
  }, [customer.orders, orderStatusFilter, orderSortBy]);

  return (
    <div className="space-y-6">
      {/* ── 1. Top Breadcrumb & Status Banner ── */}
      <div className="flex items-center justify-between">
        <Link
          href={"/admin/customers" as any}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-navy)]/65 hover:text-[var(--color-navy)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Customers</span>
        </Link>
      </div>

      {isBlocked && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-xs text-rose-800 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>
              <strong>This account is blocked.</strong> This user cannot log in or make purchases.
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleBlock}
            disabled={isPending}
            className="font-bold underline hover:text-rose-950 ml-4 cursor-pointer text-xs"
          >
            Unblock account
          </button>
        </div>
      )}

      {/* ── 2. Customer Identity Card ── */}
      <div className="rounded-2xl border border-[var(--color-sand)] bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Avatar + Details */}
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-200/80 text-xl font-bold tracking-tight text-[var(--color-navy)]">
              {initials}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--color-navy)]">
                  {customer.name || "Customer " + customer.id.slice(0, 6)}
                </h1>

                {customer.isVip && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                    <Crown className="h-3 w-3 fill-amber-500 text-amber-600" />
                    VIP
                  </span>
                )}

                {isBlocked ? (
                  <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                    Blocked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                )}
              </div>

              {/* Contact Information & Channels */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--color-navy)]/70">
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--color-navy)] font-medium">{customer.email}</span>
                  {customer.emailVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2 py-0.2 text-[10px] font-semibold text-sky-700">
                      <BadgeCheck className="h-3 w-3 text-sky-600" />
                      Verified
                    </span>
                  )}
                </div>

                {customer.phone && <CustomerPhoneActions rawPhone={customer.phone} />}
              </div>

              {/* Account Metadata */}
              <div className="flex items-center gap-3 text-[11px] text-[var(--color-navy)]/50 pt-0.5">
                <span>Joined {new Date(customer.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</span>
                <span>•</span>
                <span>Last login {customer.lastLogin || "Recently"}</span>
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2.5 self-start lg:self-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowRoleDialog(true)}
              className="h-9 rounded-xl border-[var(--color-sand)] bg-white text-xs font-semibold text-[var(--color-navy)] hover:bg-[var(--color-cream-alt)]"
            >
              <UserCheck className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              Change role
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleBlock}
              disabled={isPending}
              className={`h-9 rounded-xl text-xs font-semibold transition-colors ${
                isBlocked
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
              }`}
            >
              <Ban className="mr-1.5 h-3.5 w-3.5" />
              {isBlocked ? "Unblock" : "Block"}
            </Button>

            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="h-9 rounded-xl border-[var(--color-sand)] bg-white px-2.5 text-xs font-semibold text-[var(--color-navy)]"
              >
                More
                <MoreVertical className="ml-1 h-3.5 w-3.5 text-slate-400" />
              </Button>

              {showMoreMenu && (
                <div
                  className="absolute right-0 top-11 z-50 w-48 rounded-xl border border-[var(--color-sand)] bg-white p-1.5 shadow-xl shadow-navy/5 animate-in fade-in"
                  onMouseLeave={() => setShowMoreMenu(false)}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowRoleDialog(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--color-navy)] hover:bg-[var(--color-cream-alt)] cursor-pointer"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                    Change role ({role})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowDeleteModal(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    Delete account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. 6-Card KPI Metric Strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-3.5">
        {/* Total Spent */}
        <div className="rounded-2xl border border-[var(--color-sand)] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
            <ShoppingCart className="h-3.5 w-3.5 text-slate-400" />
            <span>Total spent</span>
          </div>
          <div className="mt-2 text-xl font-extrabold text-[var(--color-navy)]">
            Rs. {customer.kpis.totalSpent.toLocaleString()}
          </div>
          <p className="mt-0.5 text-[10px] text-[var(--color-navy)]/50">
            (Paid / Delivered orders)
          </p>
        </div>

        {/* Orders Count */}
        <div className="rounded-2xl border border-[var(--color-sand)] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
            <Package className="h-3.5 w-3.5 text-slate-400" />
            <span>Orders</span>
          </div>
          <div className="mt-2 text-xl font-extrabold text-[var(--color-navy)]">
            {customer.kpis.ordersCompleted} / {customer.kpis.ordersTotal}
          </div>
          <p className="mt-0.5 text-[10px] text-[var(--color-navy)]/50">Completed</p>
        </div>

        {/* Avg Order Value */}
        <div className="rounded-2xl border border-[var(--color-sand)] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
            <Compass className="h-3.5 w-3.5 text-slate-400" />
            <span>Avg. order value</span>
          </div>
          <div className="mt-2 text-xl font-extrabold text-[var(--color-navy)]">
            Rs. {Math.round(customer.kpis.avgOrderValue).toLocaleString()}
          </div>
          <p className="mt-0.5 text-[10px] text-[var(--color-navy)]/50">
            (from {customer.kpis.ordersCompleted} completed)
          </p>
        </div>

        {/* Last Order */}
        <div className="rounded-2xl border border-[var(--color-sand)] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>Last order</span>
          </div>
          <div className="mt-2 text-xl font-extrabold text-[var(--color-navy)] truncate">
            {customer.kpis.lastOrderDate || "No orders"}
          </div>
          <p className="mt-0.5 text-[10px] text-[var(--color-navy)]/50">
            {customer.kpis.lastOrderRelative || "—"}
          </p>
        </div>

        {/* Return Rate */}
        <div className="rounded-2xl border border-[var(--color-sand)] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            <span>Return rate</span>
          </div>
          <div className="mt-2 text-xl font-extrabold text-[var(--color-navy)]">
            {customer.kpis.returnRate}%
          </div>
          <p className="mt-0.5 text-[10px] text-[var(--color-navy)]/50">
            (1 of {customer.kpis.ordersTotal} orders)
          </p>
        </div>

        {/* COD Refusals */}
        <div className="rounded-2xl border border-amber-200/70 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <span>COD refusals</span>
          </div>
          <div className="mt-2 text-xl font-extrabold text-amber-900">
            {customer.kpis.codRefusalsCount}
          </div>
          <p className="mt-0.5 text-[10px] font-semibold text-amber-700">
            {customer.kpis.codRefusalsCount > 0 ? "(Needs attention)" : "Clean record"}
          </p>
        </div>
      </div>

      {/* ── 4. Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ── LEFT COLUMN (65% width = 8 cols) ── */}
        <div className="space-y-6 lg:col-span-8">
          {/* Order History Card */}
          <div className="rounded-2xl border border-[var(--color-sand)] bg-white p-5 shadow-xs">
            {/* Header & View all */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-sand)]/60 pb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-[family-name:var(--font-display)] text-base font-extrabold text-[var(--color-navy)]">
                  Order History
                </h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                  Last 5 orders
                </span>
              </div>
              <Link
                href={`/admin/orders?userId=${customer.id}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-navy)]/70 hover:text-[var(--color-navy)]"
              >
                View all orders ({customer.orders.length}) →
              </Link>
            </div>

            {/* Filter Toolbar */}
            <div className="mt-4 flex flex-wrap items-center gap-2 pb-3">
              <Select value={orderStatusFilter} onValueChange={(v) => v && setOrderStatusFilter(v)}>
                <SelectTrigger className="h-8.5 rounded-lg border-[var(--color-sand)] bg-[var(--color-cream-alt)]/50 text-xs font-semibold text-[var(--color-navy)]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="SHIPPED">Shipped</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select value={orderSortBy} onValueChange={(v) => v && setOrderSortBy(v)}>
                <SelectTrigger className="h-8.5 rounded-lg border-[var(--color-sand)] bg-[var(--color-cream-alt)]/50 text-xs font-semibold text-[var(--color-navy)]">
                  <SelectValue placeholder="Newest first" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEWEST">Newest first</SelectItem>
                  <SelectItem value="OLDEST">Oldest first</SelectItem>
                  <SelectItem value="HIGHEST">Highest total</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Orders Table */}
            {filteredOrders.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--color-navy)]/50">
                No orders match your filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-sand)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/50">
                      <th className="py-2.5 pr-3">Order #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Items</th>
                      <th className="py-2.5 px-3">Total</th>
                      <th className="py-2.5 px-3">Payment</th>
                      <th className="py-2.5 px-3">Payment Status</th>
                      <th className="py-2.5 px-3">Order Status</th>
                      <th className="py-2.5 pl-3 text-right">Tracking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-sand)]/50">
                    {filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-[var(--color-cream-alt)]/60 transition-colors">
                        <td className="py-3 pr-3 font-bold text-sky-700">
                          <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                            #{o.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-3 text-[var(--color-navy)]/70 whitespace-nowrap">
                          {new Date(o.createdAt).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="py-3 px-3 text-[var(--color-navy)] font-medium">
                          {o.itemsCount}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-[var(--color-navy)] whitespace-nowrap">
                          Rs. {o.total.toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              o.paymentMethod === "eSewa"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : o.paymentMethod === "Khalti"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {o.paymentMethod || "COD"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              o.paymentStatus === "PAID"
                                ? "text-emerald-700 bg-emerald-50"
                                : "text-amber-700 bg-amber-50"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                o.paymentStatus === "PAID" ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                            />
                            {o.paymentStatus === "PAID" ? "Paid" : "Pending"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                              o.status === "DELIVERED"
                                ? "bg-sky-50 text-sky-700 border-sky-200"
                                : o.status === "SHIPPED"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-indigo-50 text-indigo-700 border-indigo-200"
                            }`}
                          >
                            {o.status.charAt(0) + o.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="py-3 pl-3 text-right whitespace-nowrap">
                          {o.trackingNumber ? (
                            <button
                              type="button"
                              onClick={() => handleCopy(o.trackingNumber!, o.id)}
                              className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 hover:text-[var(--color-navy)] cursor-pointer"
                              title="Click to copy tracking code"
                            >
                              <span>{o.trackingNumber}</span>
                              {copiedId === o.id ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3 text-slate-400" />
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination footer */}
            <div className="mt-4 flex items-center justify-between border-t border-[var(--color-sand)]/60 pt-3 text-[11px] text-[var(--color-navy)]/55">
              <span>Showing {Math.min(filteredOrders.length, 5)} of {customer.orders.length} orders</span>
              <div className="flex items-center gap-1">
                <button type="button" className="h-6 w-6 rounded border border-[var(--color-sand)] text-center hover:bg-slate-50 cursor-pointer">
                  &lt;
                </button>
                <button type="button" className="h-6 w-6 rounded bg-[var(--color-navy)] text-white text-center font-bold">
                  1
                </button>
                <button type="button" className="h-6 w-6 rounded border border-[var(--color-sand)] text-center hover:bg-slate-50 cursor-pointer">
                  2
                </button>
                <button type="button" className="h-6 w-6 rounded border border-[var(--color-sand)] text-center hover:bg-slate-50 cursor-pointer">
                  &gt;
                </button>
              </div>
            </div>
          </div>

          {/* ── Shopping Intent 4-Card Grid ── */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            {/* 1. Cart */}
            <div className="flex flex-col justify-between rounded-2xl border border-[var(--color-sand)] bg-white p-4 shadow-xs">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-navy)]">
                  <ShoppingCart className="h-3.5 w-3.5 text-slate-400" />
                  <span>Cart</span>
                </div>
                <div className="mt-2 text-xs font-extrabold text-[var(--color-navy)]">
                  {customer.intent.cartItemsCount} items, worth Rs. {customer.intent.cartTotal.toLocaleString()}
                </div>
                <p className="mt-1 text-[10px] text-[var(--color-navy)]/50">
                  {customer.intent.cartUpdated ? `Updated ${customer.intent.cartUpdated}` : "Cart is currently empty"}
                </p>
              </div>
              <Link
                href="/admin/orders"
                className="mt-3 text-[11px] font-bold text-sky-700 hover:underline"
              >
                View cart →
              </Link>
            </div>

            {/* 2. Wishlist */}
            <div className="flex flex-col justify-between rounded-2xl border border-[var(--color-sand)] bg-white p-4 shadow-xs">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-navy)]">
                  <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500/20" />
                  <span>Wishlist</span>
                </div>
                <div className="mt-2 text-xs font-bold text-[var(--color-navy)]">
                  {customer.intent.wishlistCount} items
                </div>

                {/* Sneaker Thumbnail Strip */}
                <div className="mt-2 flex items-center gap-1.5">
                  {customer.intent.wishlistSneakers.slice(0, 4).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-[var(--color-sand)] bg-slate-50"
                      title={item.name}
                    >
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                      ) : (
                        <Footprints className="h-4 w-4 m-auto mt-2 text-slate-300" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <Link
                href={`/admin/products`}
                className="mt-3 text-[11px] font-bold text-sky-700 hover:underline"
              >
                View all →
              </Link>
            </div>

            {/* 3. Reviews */}
            <div className="flex flex-col justify-between rounded-2xl border border-[var(--color-sand)] bg-white p-4 shadow-xs">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-navy)]">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                  <span>Reviews</span>
                </div>
                <div className="mt-2 text-xs font-bold text-[var(--color-navy)]">
                  {customer.intent.reviewsCount} reviews · {customer.intent.avgRating} ★
                </div>
                <div className="mt-1 space-y-1">
                  {customer.intent.reviewsList.slice(0, 2).map((r) => (
                    <div key={r.id} className="text-[10px] text-[var(--color-navy)]/65 truncate">
                      <span className="font-semibold">{r.productName}</span>: {r.comment || "Great product"}
                    </div>
                  ))}
                </div>
              </div>
              <Link
                href="/admin/reviews"
                className="mt-3 text-[11px] font-bold text-sky-700 hover:underline"
              >
                View details →
              </Link>
            </div>

            {/* 4. Favourite categories & sizes */}
            <div className="flex flex-col justify-between rounded-2xl border border-[var(--color-sand)] bg-white p-4 shadow-xs">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-navy)]">
                  <Compass className="h-3.5 w-3.5 text-slate-400" />
                  <span>Favourite categories & sizes</span>
                </div>
                <div className="mt-2 text-xs font-bold text-[var(--color-navy)]">
                  {customer.intent.favoriteCategory}, usually size {customer.intent.preferredSize}
                </div>
                <p className="mt-1 text-[10px] text-[var(--color-navy)]/50">
                  Computed from past footwear orders
                </p>
              </div>
              <span className="mt-3 text-[11px] font-bold text-sky-700 hover:underline cursor-pointer">
                View details →
              </span>
            </div>
          </div>

          {/* ── Account Activity Card ── */}
          <div className="rounded-2xl border border-[var(--color-sand)] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-sand)]/60 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <h3 className="font-[family-name:var(--font-display)] text-sm font-extrabold text-[var(--color-navy)]">
                  Account Activity
                </h3>
              </div>
              <span className="text-[11px] font-bold text-sky-700 hover:underline cursor-pointer">
                View all activity →
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-y-3 sm:grid-cols-2 gap-x-6 text-xs">
              {customer.activityLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2.5">
                  <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${log.color}`} />
                  <div>
                    <span className="font-semibold text-[var(--color-navy)]">{log.title}</span>
                    <div className="text-[10px] text-[var(--color-navy)]/50">
                      {log.timestamp} • by {log.actor}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (35% width = 4 cols) ── */}
        <div className="space-y-6 lg:col-span-4">
          {/* Contact & Addresses Card */}
          <div className="rounded-2xl border border-[var(--color-sand)] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-sand)]/60 pb-3">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-slate-400" />
                <h3 className="font-[family-name:var(--font-display)] text-sm font-extrabold text-[var(--color-navy)]">
                  Contact & Addresses
                </h3>
              </div>
              <button
                type="button"
                onClick={() => alert("Address editing is managed by customer checkout or support ticket.")}
                className="text-[11px] font-bold text-sky-700 hover:underline cursor-pointer"
              >
                + Add address
              </button>
            </div>

            <div className="mt-3.5 space-y-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-navy)]/40">
                Saved Addresses
              </span>

              {customer.addresses.length === 0 ? (
                <p className="text-xs text-[var(--color-navy)]/50 py-2">No saved addresses on file.</p>
              ) : (
                customer.addresses.map((addr) => {
                  const courierFormatted = `${addr.fullName}, ${addr.phone}, ${addr.line1}${addr.line2 ? `, ${addr.line2}` : ""}, ${addr.city}, ${addr.state}, ${addr.country}`;
                  return (
                    <div
                      key={addr.id}
                      className="rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]/40 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--color-navy)]">{addr.title || "Address"}</span>
                          {addr.isDefault && (
                            <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700">
                              Default
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopy(courierFormatted, addr.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[var(--color-navy)] cursor-pointer"
                          title="Copy address for courier"
                        >
                          {copiedId === addr.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="mt-2 space-y-0.5 text-[var(--color-navy)]/70">
                        <p className="font-semibold text-[var(--color-navy)]">{addr.fullName}</p>
                        <p>{addr.phone}</p>
                        <p>{addr.line1}</p>
                        {addr.line2 && <p>{addr.line2}</p>}
                        <p>{addr.city}, {addr.state}, {addr.country}</p>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Billing Address Note */}
              <div className="border-t border-[var(--color-sand)]/60 pt-3 text-xs text-[var(--color-navy)]/60">
                <span className="font-semibold text-[var(--color-navy)]">Billing Address:</span> Same as shipping address
              </div>
            </div>
          </div>

          {/* Internal Notes Card */}
          <div className="rounded-2xl border border-[var(--color-sand)] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-sand)]/60 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <h3 className="font-[family-name:var(--font-display)] text-sm font-extrabold text-[var(--color-navy)]">
                  Internal Notes
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingNote(true)}
                className="text-[11px] font-bold text-sky-700 hover:underline cursor-pointer"
              >
                + Add note
              </button>
            </div>

            {/* Note input form */}
            {isAddingNote && (
              <div className="mt-3.5 space-y-2 rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-3">
                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Add an internal note about this customer (e.g. delivery preferences, verified phone order)..."
                  rows={3}
                  className="w-full rounded-lg border border-[var(--color-sand)] bg-white p-2 text-xs text-[var(--color-navy)] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAddingNote(false);
                      setNewNoteText("");
                    }}
                    className="h-7 rounded-lg text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddNote}
                    disabled={isPending || !newNoteText.trim()}
                    className="h-7 rounded-lg bg-[var(--color-navy)] text-white text-xs font-semibold"
                  >
                    Save Note
                  </Button>
                </div>
              </div>
            )}

            {/* Notes List */}
            <div className="mt-3.5 space-y-2.5">
              {notes.length === 0 ? (
                <p className="py-4 text-center text-xs text-[var(--color-navy)]/50">
                  No internal notes recorded yet.
                </p>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="group relative rounded-xl border border-[var(--color-sand)] bg-white p-3 text-xs shadow-2xs hover:border-[var(--color-navy)]/30 transition-all"
                  >
                    <p className="text-[var(--color-navy)] font-medium pr-6">{note.content}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--color-navy)]/50">
                      <span>by {note.authorName}</span>
                      <span>
                        {new Date(note.createdAt).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="absolute right-2.5 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Role Change Dialog ── */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Customer Role</DialogTitle>
            <DialogDescription>
              Assign a new system role for <strong>{customer.name || customer.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <label className="text-xs font-bold text-[var(--color-navy)]">Select Role</label>
            <Select value={selectedNewRole} onValueChange={(v) => v && setSelectedNewRole(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CUSTOMER">Customer (Standard buyer)</SelectItem>
                <SelectItem value="ADMIN">Administrator (Store manager)</SelectItem>
                <SelectItem value="USER">User (Standard account)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRole}
              disabled={isPending || selectedNewRole === role}
              className="bg-[var(--color-navy)] text-white font-semibold"
            >
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-700">Delete Customer Account</DialogTitle>
            <DialogDescription>
              {customer.orders.length > 0 ? (
                <>
                  Cannot delete <strong>{customer.name || customer.email}</strong> because they have{" "}
                  <strong>{customer.orders.length} associated order(s)</strong>. To restrict this customer, use the <strong>Block</strong> action instead.
                </>
              ) : (
                <>
                  Are you sure you want to permanently delete <strong>{customer.name || customer.email}</strong>? This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Close
            </Button>
            {customer.orders.length === 0 && (
              <Button
                variant="destructive"
                onClick={() => alert("Deletion simulated for customer with 0 orders.")}
              >
                Confirm Delete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
