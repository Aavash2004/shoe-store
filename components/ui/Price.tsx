"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useCurrencyStore } from "@/stores/currency-store";
import { formatCurrency, convertCurrency } from "@/lib/constants/currencies";

const emptySubscribe = () => () => {};

interface PriceProps {
  amount: number;
  className?: string;
  currency?: string;
}

export function Price({ amount, className, currency }: PriceProps) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const activeCurrency = useCurrencyStore((state) => state.currency);
  const rates = useCurrencyStore((state) => state.rates);
  const ratesLoaded = useCurrencyStore((state) => state.ratesLoaded);
  const syncRates = useCurrencyStore((state) => state.syncRatesFromServer);

  useEffect(() => {
    if (!ratesLoaded) {
      syncRates();
    }
  }, [ratesLoaded, syncRates]);

  const targetCurrency = currency || (mounted ? activeCurrency : "USD");
  const convertedAmount = convertCurrency(amount, "USD", targetCurrency, rates);
  const formatted = formatCurrency(convertedAmount, targetCurrency);

  return <span className={className}>{formatted}</span>;
}
