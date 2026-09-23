import { create } from "zustand";
import { persist } from "zustand/middleware";
import { convertCurrency, formatCurrency, CURRENCIES } from "@/lib/constants/currencies";

export type SupportedCurrency = "USD" | "NPR" | "EUR" | "GBP";

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
      currency: "USD",
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
    }
  )
);

