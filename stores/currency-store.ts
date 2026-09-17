import { create } from "zustand";
import { persist } from "zustand/middleware";
import { convertCurrency, formatCurrency, CURRENCIES } from "@/lib/constants/currencies";

export type SupportedCurrency = "USD" | "NPR" | "EUR" | "GBP";

interface CurrencyState {
  currency: SupportedCurrency;
  setCurrency: (currency: SupportedCurrency) => void;
  convertPrice: (amountInUSD: number) => number;
  formatPrice: (amountInUSD: number) => string;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: "USD",
      setCurrency: (currency) => {
        set({ currency });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("currency-changed", { detail: currency }));
        }
      },
      convertPrice: (amountInUSD) => {
        const cur = get().currency || "USD";
        return convertCurrency(amountInUSD, "USD", cur);
      },
      formatPrice: (amountInUSD) => {
        const cur = get().currency || "USD";
        const converted = convertCurrency(amountInUSD, "USD", cur);
        return formatCurrency(converted, cur);
      },
    }),
    {
      name: "shoe-store-currency",
    }
  )
);
