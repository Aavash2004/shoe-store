import Stripe from "stripe";

// Lazily or safely instantiate Stripe client so build succeeds even if env is pending
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_key_for_build";

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2026-08-26.dahlia",
  typescript: true,
});

/**
 * Minimum charge limits enforced by Stripe API.
 * Any charge below these thresholds will be rejected by Stripe.
 */
export const STRIPE_MINIMUM_CHARGES: Record<string, number> = {
  USD: 0.5, // 50 cents
  GBP: 0.3, // 30 pence
};

/**
 * Converts a major currency decimal (e.g. $129.50) into Stripe's smallest unit (e.g. 12950 cents).
 */
export function toStripeSmallestUnit(amount: number, currency: string): number {
  const upperCurrency = currency.toUpperCase();
  if (upperCurrency === "USD" || upperCurrency === "GBP") {
    return Math.round(amount * 100);
  }
  // Default to 100 multiplier for standard 2-decimal currencies
  return Math.round(amount * 100);
}

/**
 * Checks if the final charge amount meets or exceeds Stripe's minimum charge requirement.
 */
export function validateStripeChargeMinimum(
  amount: number,
  currency: string
): { isValid: boolean; minimum: number } {
  const upperCurrency = currency.toUpperCase();
  const minimum = STRIPE_MINIMUM_CHARGES[upperCurrency] ?? 0.5;

  return {
    isValid: amount >= minimum,
    minimum,
  };
}
