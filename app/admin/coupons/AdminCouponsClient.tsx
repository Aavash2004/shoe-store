"use client";

import { useState, useTransition } from "react";
import { Plus, Ticket, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCoupon, toggleCouponStatus, deleteCoupon } from "./actions";

interface CouponItem {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minSubtotal: number;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export function AdminCouponsClient({ coupons }: { coupons: CouponItem[] }) {
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("10");
  const [minSubtotal, setMinSubtotal] = useState("0");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    startTransition(async () => {
      const res = await createCoupon({
        code,
        discountType,
        discountValue: Number(discountValue),
        minSubtotal: Number(minSubtotal),
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt || null,
      });

      if (!res.success) {
        setErrorMessage(res.error as string);
      } else {
        setShowModal(false);
        setCode("");
        setDiscountValue("10");
        setMinSubtotal("0");
        setMaxUses("");
        setExpiresAt("");
      }
    });
  }

  function handleToggle(id: string, currentActive: boolean) {
    startTransition(async () => {
      await toggleCouponStatus(id, currentActive);
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    startTransition(async () => {
      await deleteCoupon(id);
    });
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-navy)]/55">
            Marketing
          </span>
          <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-[var(--color-navy)]">
            Coupons & Promo Codes
          </h1>
          <p className="mt-1 text-xs text-[var(--color-navy)]/60">
            {coupons.length} coupon{coupons.length !== 1 ? "s" : ""} created
          </p>
        </div>

        <Button
          onClick={() => setShowModal(true)}
          className="h-11 rounded-xl px-5 shadow-2xs bg-[var(--color-navy)] text-[var(--color-cream)] hover:bg-[var(--color-navy)]/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Coupon
        </Button>
      </div>

      {/* Coupons Table */}
      {coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] py-20 text-center shadow-2xs">
          <Ticket className="mb-4 h-10 w-10 text-[var(--color-navy)]/30" />
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-navy)]">
            No promo codes yet
          </h2>
          <p className="mt-1 text-xs text-[var(--color-navy)]/60">Create your first coupon code to offer discounts.</p>
          <Button onClick={() => setShowModal(true)} className="mt-6 rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Create Coupon
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] shadow-2xs">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-sand)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
                <th className="px-6 py-4 font-bold">Code</th>
                <th className="px-6 py-4 font-bold">Discount</th>
                <th className="px-6 py-4 font-bold">Min Subtotal</th>
                <th className="px-6 py-4 font-bold">Usage</th>
                <th className="px-6 py-4 text-right font-bold">Status</th>
                <th className="px-6 py-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-sand)]/70">
              {coupons.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--color-sand)]/20 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-xs bg-[var(--color-cream)] border border-[var(--color-sand)] px-2.5 py-1 rounded-lg text-[var(--color-navy)]">
                      {item.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-[var(--color-navy)]">
                    {item.discountType === "PERCENTAGE"
                      ? `${item.discountValue}% OFF`
                      : `$${item.discountValue.toFixed(2)} OFF`}
                  </td>
                  <td className="px-6 py-4 text-xs text-[var(--color-navy)]/70">
                    ${item.minSubtotal.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-xs text-[var(--color-navy)]/70">
                    {item.usedCount} {item.maxUses !== null ? `/ ${item.maxUses}` : "uses"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleToggle(item.id, item.isActive)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                        item.isActive
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-rose-600 hover:text-rose-700 p-1 transition-colors"
                      title="Delete Coupon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Coupon Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream)] p-6 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-[var(--color-sand)] pb-3">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)]">
                Create Promo Coupon
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[var(--color-navy)]/40 hover:text-[var(--color-navy)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--color-navy)]/70 mb-1">
                  Coupon Code (e.g. WELCOME10)
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="WELCOME10"
                  className="w-full rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-2.5 uppercase font-mono font-bold text-[var(--color-navy)] focus:outline-none focus:border-[var(--color-navy)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--color-navy)]/70 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-2.5 text-[var(--color-navy)] focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[var(--color-navy)]/70 mb-1">
                    Value ({discountType === "PERCENTAGE" ? "%" : "$"})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-2.5 text-[var(--color-navy)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--color-navy)]/70 mb-1">
                    Min Subtotal ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={minSubtotal}
                    onChange={(e) => setMinSubtotal(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-2.5 text-[var(--color-navy)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--color-navy)]/70 mb-1">
                    Max Uses (Optional)
                  </label>
                  <input
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-2.5 text-[var(--color-navy)] focus:outline-none"
                  />
                </div>
              </div>

              {errorMessage && (
                <p className="text-xs font-semibold text-rose-600">{errorMessage}</p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-sand)]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl h-9 text-xs bg-[var(--color-navy)] text-[var(--color-cream)] hover:bg-[var(--color-navy)]/90"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Coupon"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
