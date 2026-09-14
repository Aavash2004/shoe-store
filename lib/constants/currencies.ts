export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  isStripeChargeable: boolean;
  isCodAllowed: boolean;
  // NOTE: rateToBaseUSD is currently a static configuration value.
  // Base catalog pricing is anchored in USD.
  // In a future phase, this will need a documented operational owner or scheduled update cadence (e.g. daily ECB/Fixer fetch).
  rateToBaseUSD: number;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  USD: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    isStripeChargeable: true,
    isCodAllowed: false,
    rateToBaseUSD: 1.0,
  },
  GBP: {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    isStripeChargeable: true,
    isCodAllowed: false,
    rateToBaseUSD: 0.78, // Approximate GBP/USD peg; static for Phase 1
  },
  NPR: {
    code: "NPR",
    name: "Nepalese Rupee",
    symbol: "Rs.",
    isStripeChargeable: false, // Stripe does not natively process domestic NPR
    isCodAllowed: true,
    rateToBaseUSD: 135.0, // Approximate NPR/USD peg; static for Phase 1
  },
};

const DEFAULT_LOCALES: Record<string, string> = {
  USD: "en-US",
  GBP: "en-GB",
  NPR: "ne-NP",
};

/**
 * Standardized currency formatting utility using Intl.NumberFormat.
 * Replaces manual string concatenation throughout the codebase.
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale?: string
): string {
  const upperCurrency = currency.toUpperCase();
  const targetLocale = locale || DEFAULT_LOCALES[upperCurrency] || "en-US";

  try {
    return new Intl.NumberFormat(targetLocale, {
      style: "currency",
      currency: upperCurrency,
      minimumFractionDigits: upperCurrency === "NPR" ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (err) {
    // Fallback if environment lacks specific currency support
    const symbol = CURRENCIES[upperCurrency]?.symbol || "$";
    return `${symbol}${amount.toFixed(2)}`;
  }
}
