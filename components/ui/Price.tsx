"use client";

import { useEffect, useState } from "react";
import { useCurrencyStore } from "@/stores/currency-store";
import { formatCurrency, convertCurrency } from "@/lib/constants/currencies";

interface PriceProps {
  amount: number;
  className?: string;
  currency?: string;
}

export function Price({ amount, className, currency }: PriceProps) {
  const [mounted, setMounted] = useState(false);
  const activeCurrency = useCurrencyStore((state) => state.currency);

  useEffect(() => {
    setMounted(true);
  }, []);

  const targetCurrency = currency || (mounted ? activeCurrency : "USD");
  const convertedAmount = convertCurrency(amount, "USD", targetCurrency);
  const formatted = formatCurrency(convertedAmount, targetCurrency);

  return <span className={className}>{formatted}</span>;
}
