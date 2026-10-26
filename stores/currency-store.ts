import { create } from "zustand";
import { persist } from "zustand/middleware";
import { convertCurrency, formatCurrency, CURRENCIES } from "@/lib/constants/currencies";

export type SupportedCurrency = "USD" | "NPR" | "EUR" | "GBP";

const readCookieCurrency = (): SupportedCurrency | undefined => {
  if (typeof document === "undefined") return undefined;
  try {
    const rawCookies = document.cookie.split(";").map((c) => c.trim());
    for (let i = rawCookies.length - 1; i >= 0; i--) {
      const parts = rawCookies[i].split("=");
      if (parts[0] === "shoe_currency" && ["USD", "NPR", "EUR", "GBP"].includes(parts[1])) {
        return parts[1] as SupportedCurrency;
      }
    }
  } catch {}
  return undefined;
};

const getInitialCurrency = (): SupportedCurrency => {
  if (typeof window !== "undefined") {
    try {
      // 1. Primary source of truth: cookie shared with SSR
      const cookieCur = readCookieCurrency();
      if (cookieCur) return cookieCur;

      // 2. Persisted Zustand state in localStorage
      const persisted = localStorage.getItem("shoe-store-currency");
      if (persisted) {
        const parsed = JSON.parse(persisted);
        const cur = parsed?.state?.currency;
        if (cur && ["USD", "NPR", "EUR", "GBP"].includes(cur)) {
          return cur;
        }
      }

      // 3. Migrate legacy admin_selected_currency if present
      const adminLegacy = localStorage.getItem("admin_selected_currency");
      if (adminLegacy && ["USD", "NPR", "EUR", "GBP"].includes(adminLegacy)) {
        localStorage.removeItem("admin_selected_currency");
        return adminLegacy as SupportedCurrency;
      }
    } catch {}
  }
  return "USD";
};

interface CurrencyState {
  currency: SupportedCurrency;
  rates: Record<string, number>;
  ratesLoaded: boolean;
  provider?: string;
  lastUpdated?: string;
  setCurrency: (currency: SupportedCurrency) => void;
  setRates: (rates: Record<string, number>) => void;
  syncRatesFromServer: (force?: boolean) => Promise<void>;
  convertPrice: (amountInUSD: number, targetCurrency?: SupportedCurrency) => number;
  formatPrice: (amountInUSD: number, targetCurrency?: SupportedCurrency) => string;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: getInitialCurrency(),
      rates: {
        USD: 1.0,
        NPR: CURRENCIES.NPR?.rateToBaseUSD ?? 135.0,
        GBP: CURRENCIES.GBP?.rateToBaseUSD ?? 0.78,
        EUR: CURRENCIES.EUR?.rateToBaseUSD ?? 0.92,
      },
      ratesLoaded: false,
      setCurrency: (currency) => {
        set({ currency });
        if (typeof window !== "undefined") {
          try {
            document.cookie = `shoe_currency=${currency}; path=/; max-age=31536000; SameSite=Lax`;
            localStorage.removeItem("admin_selected_currency");
          } catch {}
          window.dispatchEvent(new CustomEvent("currency-changed", { detail: currency }));
        }
      },
      setRates: (rates) => set({ rates, ratesLoaded: true }),
      syncRatesFromServer: async (force = false) => {
        try {
          const url = force ? "/api/currencies?refresh=true" : "/api/currencies";
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data?.rates) {
              set({
                rates: data.rates,
                ratesLoaded: true,
                provider: data.provider,
                lastUpdated: data.timestamp,
              });
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("currency-rates-updated", { detail: data.rates })
                );
              }
            }
          }
        } catch {
          // Graceful fallback to currently stored or static rates
        }
      },
      convertPrice: (amountInUSD, targetCurrency) => {
        const cur = targetCurrency || get().currency || "USD";
        const rates = get().rates;
        return convertCurrency(amountInUSD, "USD", cur, rates);
      },
      formatPrice: (amountInUSD, targetCurrency) => {
        const cur = targetCurrency || get().currency || "USD";
        const rates = get().rates;
        const converted = convertCurrency(amountInUSD, "USD", cur, rates);
        return formatCurrency(converted, cur);
      },
    }),
    {
      name: "shoe-store-currency",
      partialize: (state) => ({ currency: state.currency }),
      merge: (persistedState: any, currentState) => {
        const cookieCurrency = readCookieCurrency();
        return {
          ...currentState,
          ...(persistedState || {}),
          currency:
            cookieCurrency ||
            (persistedState?.currency as SupportedCurrency) ||
            currentState.currency ||
            "USD",
        };
      },
    }
  )
);

