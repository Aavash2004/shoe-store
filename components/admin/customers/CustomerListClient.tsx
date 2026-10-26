"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Crown,
  ChevronRight,
  ShoppingCart,
  TrendingUp,
  UserCheck,
  Calendar,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounce";

export type CustomerListItem = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  ordersCount: number;
  totalSpent: number;
};

interface CustomerListClientProps {
  initialCustomers: CustomerListItem[];
}

export function CustomerListClient({ initialCustomers }: CustomerListClientProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const debouncedSearch = useDebouncedValue(search, 150);

  const kpis = useMemo(() => {
    const total = initialCustomers.length;
    const vips = initialCustomers.filter((c) => c.totalSpent > 25000 || c.role === "ADMIN").length;
    const totalOrders = initialCustomers.reduce((sum, c) => sum + c.ordersCount, 0);
    const totalRevenue = initialCustomers.reduce((sum, c) => sum + c.totalSpent, 0);

    return {
      total,
      vips,
      totalOrders,
      totalRevenue,
    };
  }, [initialCustomers]);

  const filtered = useMemo(() => {
    return initialCustomers.filter((c) => {
      if (roleFilter !== "ALL" && c.role !== roleFilter) return false;

      if (debouncedSearch.trim()) {
        const q = debouncedSearch.trim().toLowerCase();
        const matchName = c.name?.toLowerCase().includes(q) ?? false;
        const matchEmail = c.email.toLowerCase().includes(q);
        const matchPhone = c.phone?.toLowerCase().includes(q) ?? false;
        if (!matchName && !matchEmail && !matchPhone) return false;
      }

      return true;
    });
  }, [initialCustomers, roleFilter, debouncedSearch]);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-sand)] pb-5">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-navy)]/40">
            Store CRM
          </span>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-navy)]">
            Customers
          </h1>
          <p className="mt-0.5 text-xs text-[var(--color-navy)]/65">
            Manage your registered shoppers, customer profiles, order history, and VIP accounts.
          </p>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[var(--color-sand)] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
            <span>Total Customers</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-[var(--color-navy)]">{kpis.total}</div>
        </div>

        <div className="rounded-2xl border border-[var(--color-sand)] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-800">
            <span>VIP Members</span>
            <Crown className="h-4 w-4 text-amber-500 fill-amber-500/20" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-900">{kpis.vips}</div>
        </div>

        <div className="rounded-2xl border border-[var(--color-sand)] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
            <span>Total Orders</span>
            <ShoppingCart className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-[var(--color-navy)]">{kpis.totalOrders}</div>
        </div>

        <div className="rounded-2xl border border-[var(--color-sand)] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            <span>Total Customer LTV</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-900">
            Rs. {Math.round(kpis.totalRevenue).toLocaleString()}
          </div>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[var(--color-sand)] bg-white p-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-navy)]/40 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers by name, email, or phone number..."
            className="h-10 pl-9 pr-4 rounded-xl border-[var(--color-sand)] bg-[var(--color-cream-alt)]/50 text-sm text-[var(--color-navy)] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {["ALL", "CUSTOMER", "ADMIN"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                roleFilter === r
                  ? "bg-[var(--color-navy)] text-white shadow-xs"
                  : "bg-[var(--color-cream-alt)] text-[var(--color-navy)]/70 hover:bg-slate-200/60"
              }`}
            >
              {r === "ALL" ? "All Roles" : r.charAt(0) + r.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-sand)] bg-white shadow-xs">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--color-navy)]/50">
            No customers match your search query.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-sand)] bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4 text-right">Orders</th>
                <th className="py-3.5 px-4 text-right">Total Spent</th>
                <th className="py-3.5 px-4 text-right">Joined</th>
                <th className="py-3.5 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-sand)]/60">
              {filtered.map((c) => {
                const initials = c.name
                  ? c.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                  : c.email.slice(0, 2).toUpperCase();
                const isVip = c.totalSpent > 25000 || c.role === "ADMIN";

                return (
                  <tr key={c.id} className="hover:bg-[var(--color-cream-alt)]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-[var(--color-navy)]">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-[var(--color-navy)]">
                            <span>{c.name || "Customer"}</span>
                            {isVip && (
                              <span title="VIP Shopper">
                                <Crown className="h-3 w-3 fill-amber-500 text-amber-500" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[var(--color-navy)]/60">{c.email}</div>
                          {c.phone && <div className="text-[10px] text-slate-400">{c.phone}</div>}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          c.role === "ADMIN"
                            ? "bg-[var(--color-navy)]/10 text-[var(--color-navy)]"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {c.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-semibold text-[var(--color-navy)]">
                      {c.ordersCount}
                    </td>

                    <td className="py-3.5 px-4 text-right font-extrabold text-[var(--color-navy)]">
                      Rs. {Math.round(c.totalSpent).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-right text-[11px] text-[var(--color-navy)]/55 whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="py-3.5 pr-4 text-right">
                      <Link
                        href={`/admin/customers/${c.id}` as any}
                        className="inline-flex items-center gap-1 rounded-xl border border-[var(--color-sand)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--color-navy)] hover:border-[var(--color-navy)]/40 hover:bg-[var(--color-cream-alt)] transition-all shadow-2xs"
                      >
                        <span>View Profile</span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
