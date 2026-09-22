import { create } from "zustand";
import { persist } from "zustand/middleware";
import { convertCurrency, formatCurrency, CURRENCIES } from "@/lib/constants/currencies";

export type SupportedCurrency = "USD" | "NPR" | "EUR" | "GBP";

interface CurrencyState {
  currency: SupportedCurrency;
  rates: Record<string, number>;
  setCurrency: (currency: SupportedCurrency) => void;
  setRates: (rates: Record<string, number>) => void;
  syncRatesFromServer: () => Promise<void>;
  convertPrice: (amountInUSD: number) => number;
  formatPrice: (amountInUSD: number) => string;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: "USD",
      rates: {
        USD: 1.0,
        NPR: CURRENCIES.NPR?.rateToBaseUSD ?? 135.0,
        GBP: CURRENCIES.GBP?.rateToBaseUSD ?? 0.78,
        EUR: CURRENCIES.EUR?.rateToBaseUSD ?? 0.92,
      },
      setCurrency: (currency) => {
        set({ currency });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("currency-changed", { detail: currency }));
        }
      },
      setRates: (rates) => set({ rates }),
      syncRatesFromServer: async () => {
        try {
          const res = await fetch("/api/currencies");
          if (res.ok) {
            const data = await res.json();
            if (data?.rates) {
              set({ rates: data.rates });
            }
          }
        } catch {
          // Graceful fallback to currently stored or static rates
        }
      },
      convertPrice: (amountInUSD) => {
        const cur = get().currency || "USD";
        const rates = get().rates;
        return convertCurrency(amountInUSD, "USD", cur, rates);
      },
      formatPrice: (amountInUSD) => {
        const cur = get().currency || "USD";
        const rates = get().rates;
        const converted = convertCurrency(amountInUSD, "USD", cur, rates);
        return formatCurrency(converted, cur);
      },
    }),
    {
      name: "shoe-store-currency",
    }
  )
);
