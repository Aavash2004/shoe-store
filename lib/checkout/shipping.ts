export interface ShippingQuote {
  shippingCost: number;
  isFree: boolean;
  freeThreshold: number;
  amountNeededForFree: number;
  thresholdProgress: number; // 0 - 100%
  carrierName: string;
}

interface CountryShippingRule {
  freeThreshold: number;
  flatRate: number;
  carrierName: string;
}

const SHIPPING_RULES: Record<string, CountryShippingRule> = {
  NP: {
    freeThreshold: 3000,
    flatRate: 150,
    carrierName: "Domestic Doorstep Express",
  },
  US: {
    freeThreshold: 150,
    flatRate: 15,
    carrierName: "International Priority Express",
  },
  GB: {
    freeThreshold: 120,
    flatRate: 12,
    carrierName: "UK Royal Mail Tracked International",
  },
};

/**
 * Calculates shipping cost, free threshold progress, and carrier name for a destination country.
 */
export function calculateShipping(
  subtotal: number,
  countryCode: string
): ShippingQuote {
  const code = (countryCode || "NP").toUpperCase();
  const rule = SHIPPING_RULES[code] || SHIPPING_RULES.NP;

  const isFree = subtotal >= rule.freeThreshold;
  const shippingCost = isFree ? 0 : rule.flatRate;
  const amountNeededForFree = Math.max(0, rule.freeThreshold - subtotal);
  const thresholdProgress = Math.min(
    100,
    Math.round((subtotal / rule.freeThreshold) * 100)
  );

  return {
    shippingCost,
    isFree,
    freeThreshold: rule.freeThreshold,
    amountNeededForFree,
    thresholdProgress,
    carrierName: rule.carrierName,
  };
}
