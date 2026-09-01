"use client";

import { useState } from "react";
import { Ticket, X, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AppliedCoupon {
  code: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  discountAmount: number;
}

interface CouponInputProps {
  subtotal: number;
  appliedCoupon: AppliedCoupon | null;
  onApplyCoupon: (coupon: AppliedCoupon | null) => void;
}

export function CouponInput({
  subtotal,
  appliedCoupon,
  onApplyCoupon,
}: CouponInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setErrorMessage("Please enter a promo code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, subtotal }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setErrorMessage(data.error || "Invalid promo code.");
      } else {
        onApplyCoupon({
          code: data.code,
          discountType: data.discountType,
          discountValue: data.discountValue,
          discountAmount: data.discountAmount,
        });
        setCode("");
        setErrorMessage("");
      }
    } catch (err) {
      console.error("Coupon apply error:", err);
      setErrorMessage("Failed to validate coupon.");
    } finally {
      setLoading(false);
    }
  }

  function handleRemove() {
    onApplyCoupon(null);
  }

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <div>
            <span className="font-mono font-bold text-emerald-900 uppercase">
              {appliedCoupon.code}
            </span>
            <span className="ml-2 font-medium text-emerald-700">
              (-${appliedCoupon.discountAmount.toFixed(2)})
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="text-emerald-700 hover:text-emerald-900 p-0.5"
          title="Remove coupon"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <form onSubmit={handleApply} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-navy)]/40 pointer-events-none" />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Promo code (e.g. WELCOME10)"
            className="w-full rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] py-2 pl-9 pr-3 text-xs uppercase font-mono font-semibold text-[var(--color-navy)] placeholder:[var(--color-navy)]/40 placeholder:normal-case placeholder:font-sans focus:border-[var(--color-navy)]/40 focus:bg-white focus:outline-none transition-colors"
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !code.trim()}
          className="h-9 rounded-xl px-4 text-xs font-semibold bg-[var(--color-navy)] text-[var(--color-cream)] hover:bg-[var(--color-navy)]/90 disabled:opacity-50 shrink-0"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
        </Button>
      </form>
      {errorMessage && (
        <p className="text-[11px] font-semibold text-rose-600">{errorMessage}</p>
      )}
    </div>
  );
}
