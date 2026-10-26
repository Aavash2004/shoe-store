/**
 * Shared pure calculation utility for checkout discounts and totals.
 * Free of database or Node.js runtime dependencies so it can be safely used
 * by both client components and server-side pricing modules.
 */

export interface CalculateDiscountAndTotalInput {
  subtotal: number;
  discountType?: "PERCENTAGE" | "FIXED_AMOUNT" | "FIXED" | string | null;
  discountValue?: number | null;
  currency: string;
  shipping?: number;
}

export interface CalculateDiscountAndTotalResult {
  discount: number;
  total: number;
}

/**
 * Pure function to calculate coupon discount and order total with currency-specific rounding:
 * - NPR: Integer Rupee rounding (no fractional paisa on final totals)
 * - USD / GBP / EUR: Standard 2 decimal places rounding
 */
export function calculateDiscountAndTotal(
  input: CalculateDiscountAndTotalInput
): CalculateDiscountAndTotalResult {
  const { subtotal, discountType, discountValue, currency, shipping = 0 } = input;
  const isNpr = (currency || "").toUpperCase() === "NPR";

  let discount = 0;
  if (discountType && discountValue != null && discountValue > 0) {
    if (discountType === "PERCENTAGE") {
      discount = (subtotal * discountValue) / 100;
    } else {
      discount = discountValue;
    }

    // Ensure discount never exceeds subtotal or drops below 0
    discount = Math.min(discount, Math.max(0, subtotal));
    discount = Math.max(0, discount);

    discount = isNpr
      ? Math.round(discount)
      : Math.round(discount * 100) / 100;
  }

  const rawTotal = Math.max(0, subtotal - discount + (shipping || 0));
  const total = isNpr
    ? Math.round(rawTotal)
    : Math.round(rawTotal * 100) / 100;

  return { discount, total };
}
