import { prisma } from "@/lib/db/prisma";
import { COUNTRIES, getCountryByCode } from "@/lib/constants/countries";
import { CURRENCIES } from "@/lib/constants/currencies";
import { calculateShipping, ShippingQuote } from "@/lib/checkout/shipping";
import { getExchangeRates } from "@/lib/services/exchangeRates";

export interface PricingOrderItem {
  variantId: string;
  productName: string;
  size: string;
  color: string;
  sku: string;
  price: number; // Unit price in order currency
  quantity: number;
  subtotal: number;
}

export interface OrderPricingResult {
  currency: string;
  exchangeRate: number;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  orderItems: PricingOrderItem[];
  shippingQuote: ShippingQuote;
}

export class PricingError extends Error {
  readonly code: string;
  constructor(message: string, code: string = "PRICING_ERROR") {
    super(message);
    this.name = "PricingError";
    this.code = code;
  }
}

/**
 * Server-side source of truth for pricing calculations.
 * Never trusts prices sent by the client.
 */
export async function calculateOrderPricing(
  items: Array<{ variantId: string; quantity: number }>,
  countryCode: string,
  couponCode?: string,
  dbClient: any = prisma
): Promise<OrderPricingResult> {
  const code = (countryCode || "NP").toUpperCase();
  const country = getCountryByCode(code);
  if (!country) {
    throw new PricingError(`Unsupported destination country: ${countryCode}`, "INVALID_COUNTRY");
  }

  const currencyCode = country.currency || "NPR";
  const rates = await getExchangeRates(dbClient);
  const exchangeRate = rates[currencyCode] || CURRENCIES[currencyCode]?.rateToBaseUSD || 1.0;

  // Fetch all variants with their parent products
  const variantIds = items.map((i) => i.variantId);
  const variants = await dbClient.productVariant.findMany({
    where: {
      id: { in: variantIds },
      isActive: true,
      deletedAt: null,
      product: {
        isActive: true,
        deletedAt: null,
      },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (variants.length !== items.length) {
    throw new PricingError(
      "One or more items in your cart are no longer available.",
      "ITEM_UNAVAILABLE"
    );
  }

  // Calculate item prices in destination currency
  const orderItems: PricingOrderItem[] = items.map((item) => {
    const variant = variants.find((v: any) => v.id === item.variantId);
    if (!variant) {
      throw new PricingError(
        `Variant ${item.variantId} not found or inactive`,
        "VARIANT_NOT_FOUND"
      );
    }

    const usdPrice = Number(variant.price);
    // Currency conversion with destination-specific rounding:
    // NPR: Integer Rupee rounding
    // USD / GBP: 2 decimal rounding
    const convertedUnit =
      currencyCode === "NPR"
        ? Math.round(usdPrice * exchangeRate)
        : Math.round(usdPrice * exchangeRate * 100) / 100;

    const itemSubtotal =
      currencyCode === "NPR"
        ? Math.round(convertedUnit * item.quantity)
        : Math.round(convertedUnit * item.quantity * 100) / 100;

    return {
      variantId: variant.id,
      productName: variant.product.name,
      size: variant.size,
      color: variant.color,
      sku: variant.sku,
      price: convertedUnit,
      quantity: item.quantity,
      subtotal: itemSubtotal,
    };
  });

  const rawSubtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);
  const subtotal =
    currencyCode === "NPR"
      ? Math.round(rawSubtotal)
      : Math.round(rawSubtotal * 100) / 100;

  // Calculate shipping based on destination country rules
  const shippingQuote = calculateShipping(subtotal, code);
  const shipping = shippingQuote.shippingCost;

  // Optional coupon discount calculation
  let discount = 0;
  if (couponCode && couponCode.trim()) {
    const coupon = await dbClient.coupon.findUnique({
      where: { code: couponCode.trim().toUpperCase() },
    });

    if (
      coupon &&
      coupon.isActive &&
      (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
      (!coupon.maxUses || coupon.usedCount < coupon.maxUses)
    ) {
      const minSub = Number(coupon.minSubtotal) * exchangeRate;
      if (subtotal >= minSub) {
        if (coupon.discountType === "PERCENTAGE") {
          const pct = Number(coupon.discountValue);
          discount = (subtotal * pct) / 100;
        } else {
          discount = Number(coupon.discountValue) * exchangeRate;
        }
        discount = Math.min(discount, subtotal);
        discount =
          currencyCode === "NPR"
            ? Math.round(discount)
            : Math.round(discount * 100) / 100;
      }
    }
  }

  // Tax calculation rules:
  // - Nepal (NP): 13% VAT is included in catalog retail price (standard domestic retail rule)
  //   taxAmount = subtotal - (subtotal / 1.13)
  // - US/GB: DDU (Delivered Duty Unpaid) model; no domestic VAT collected at checkout (tax = 0)
  let tax = 0;
  if (code === "NP") {
    tax = Math.round(subtotal - subtotal / 1.13);
  } else {
    tax = 0;
  }

  const rawTotal = Math.max(0, subtotal - discount + shipping);
  const total =
    currencyCode === "NPR"
      ? Math.round(rawTotal)
      : Math.round(rawTotal * 100) / 100;

  return {
    currency: currencyCode,
    exchangeRate,
    subtotal,
    shipping,
    tax,
    discount,
    total,
    orderItems,
    shippingQuote,
  };
}
