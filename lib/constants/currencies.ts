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
  EUR: {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    isStripeChargeable: true,
    isCodAllowed: false,
    rateToBaseUSD: 0.92, // Approximate EUR/USD peg
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
  EUR: "de-DE",
  GBP: "en-GB",
  NPR: "en-US", // Standardize on English numerals and prefix for NPR
};

/**
 * Convert an amount between currencies using base USD exchange rates.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string = "USD",
  toCurrency: string = "USD"
): number {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  if (from === to || !amount) return amount;

  const fromRate = CURRENCIES[from]?.rateToBaseUSD ?? 1.0;
  const toRate = CURRENCIES[to]?.rateToBaseUSD ?? 1.0;

  // Convert from source currency to base USD, then from USD to target currency
  const inUSD = amount / fromRate;
  return inUSD * toRate;
}

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
    if (upperCurrency === "NPR") {
      // Formats as "NPR 12,000" in English numerals rather than Devnagari script
      const formattedNumber = new Intl.NumberFormat(targetLocale, {
        maximumFractionDigits: 0,
      }).format(amount);
      return `NPR ${formattedNumber}`;
    }

    return new Intl.NumberFormat(targetLocale, {
      style: "currency",
      currency: upperCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (err) {
    // Fallback if environment lacks specific currency support
    const symbol = CURRENCIES[upperCurrency]?.symbol || "$";
    return `${symbol}${amount.toFixed(2)}`;
  }
}
