"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Globe } from "lucide-react";
import { useCurrencyStore, type SupportedCurrency } from "@/stores/currency-store";
import { CURRENCIES } from "@/lib/constants/currencies";

const CURRENCY_OPTIONS: { code: SupportedCurrency; name: string; symbol: string }[] = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "NPR", name: "Nepalese Rupee", symbol: "Rs." },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
];

interface CurrencySwitcherProps {
  variant?: "dropdown" | "segmented";
  className?: string;
}

export function CurrencySwitcher({ variant = "dropdown", className = "" }: CurrencySwitcherProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { currency, setCurrency } = useCurrencyStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const activeCode: SupportedCurrency = mounted ? currency : "USD";
  const activeCurrencyConfig = CURRENCIES[activeCode] || { symbol: "$", code: "USD" };

  // Segmented control variant for mobile drawer / compact spaces
  if (variant === "segmented") {
    return (
      <div
        className={`inline-flex items-center rounded-full border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-1 ${className}`}
      >
        {CURRENCY_OPTIONS.map((opt) => {
          const isActive = activeCode === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => setCurrency(opt.code)}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-[var(--color-navy)] text-white shadow-xs"
                  : "text-[var(--color-navy)]/60 hover:text-[var(--color-navy)]"
              }`}
            >
              <span>{opt.code}</span>
              <span className={isActive ? "text-white/80" : "text-[var(--color-navy)]/40"}>
                ({opt.symbol})
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // Minimal dropdown variant for the top desktop header
  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="group flex items-center gap-1.5 rounded-full border border-[var(--color-sand)]/90 bg-[var(--color-cream)] px-2.5 py-1 text-xs font-semibold text-[var(--color-navy)]/80 transition-all duration-200 hover:border-[var(--color-navy)]/30 hover:bg-[var(--color-cream-alt)] hover:text-[var(--color-navy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sky)] shadow-2xs"
        title="Change currency"
      >
        <span className="font-bold text-[11px] tracking-tight text-[var(--color-navy)]">
          {activeCode}
        </span>
        <span className="text-[11px] text-[var(--color-navy)]/50 font-medium">
          ({activeCurrencyConfig.symbol})
        </span>
        <ChevronDown
          className={`h-3 w-3 text-[var(--color-navy)]/45 transition-transform duration-200 ${
            open ? "rotate-180 text-[var(--color-navy)]" : "group-hover:text-[var(--color-navy)]"
          }`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 origin-top-right rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream)] p-1.5 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest text-[var(--color-navy)]/40 border-b border-[var(--color-sand)]/60 mb-1">
            Select Currency
          </div>
          <div role="listbox" className="space-y-0.5">
            {CURRENCY_OPTIONS.map((opt) => {
              const isActive = activeCode === opt.code;
              return (
                <button
                  key={opt.code}
                  role="option"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => {
                    setCurrency(opt.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors duration-150 ${
                    isActive
                      ? "bg-[var(--color-navy)] text-white font-bold"
                      : "text-[var(--color-navy)]/75 hover:bg-[var(--color-sand)]/40 hover:text-[var(--color-navy)] font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{opt.code}</span>
                    <span className={isActive ? "text-white/70" : "text-[var(--color-navy)]/40"}>
                      · {opt.name}
                    </span>
                  </div>
                  {isActive && <Check className="h-3.5 w-3.5 text-white stroke-[2.5]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
