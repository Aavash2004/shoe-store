import Stripe from "stripe";
import { decrementStockWithLock, InsufficientStockError } from "@/lib/checkout/stock";
import * as Sentry from "@sentry/nextjs";

// Dynamically resolve Stripe client so it reads process.env.STRIPE_SECRET_KEY at call time,
// preventing static module evaluation from permanently locking in the placeholder build key.
let _stripeClientInstance: Stripe | null = null;
let _cachedKey: string | null = null;

export function getStripeClient(): Stripe {
  let currentKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!currentKey) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("dotenv").config();
      currentKey = process.env.STRIPE_SECRET_KEY?.trim();
    } catch {}
  }
  const effectiveKey = currentKey || "sk_test_placeholder_key_for_build";
  if (!_stripeClientInstance || _cachedKey !== effectiveKey) {
    _stripeClientInstance = new Stripe(effectiveKey, {
      apiVersion: "2026-08-26.dahlia",
      typescript: true,
    });
    _cachedKey = effectiveKey;
  }
  return _stripeClientInstance;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const client = getStripeClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
  set(_target, prop, value) {
    const client = getStripeClient();
    return Reflect.set(client, prop, value);
  },
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

export interface ConfirmStripePaymentOptions {
  paymentIntentId?: string;
  amount?: number;
  currency?: string;
  source?: string;
}

export interface ConfirmStripePaymentResult {
  success: boolean;
  count: number;
  orderId?: string;
  status?: string;
  reason?: string;
}

/**
 * Shared late-payment handler for Stripe orders that were previously CANCELLED.
 * - If order was cancelled due to timeout (EXPIRED), attempts to reinstate if stock permits.
 * - If order was cancelled deliberately by CUSTOMER or ADMIN, DO NOT reinstate; auto-refunds via Stripe.
 * - If stock is unavailable, issues an automatic refund.
 * - If refund fails, places order in MANUAL_REVIEW with an admin alert.
 */
export async function handleLatePayment(
  order: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    stripePaymentIntentId: string | null;
    cancelReason: string | null;
    couponId: string | null;
    items: Array<{ variantId: string; quantity: number }>;
  },
  options?: ConfirmStripePaymentOptions
): Promise<ConfirmStripePaymentResult> {
  const { prisma } = await import("@/lib/db/prisma");
  const piId = options?.paymentIntentId || order.stripePaymentIntentId;

  if (!piId) {
    return { success: false, count: 0, orderId: order.id };
  }

  // Already terminal paid or refunded: skip
  if (order.paymentStatus === "PAID" || order.paymentStatus === "REFUNDED") {
    return { success: false, count: 0, orderId: order.id, status: order.status };
  }

  // Rule 3: Late payment reinstates ONLY when cancelReason is strictly 'EXPIRED'.
  // If cancelReason is null/undefined, or 'CUSTOMER', or 'ADMIN': NEVER reinstate; issue auto-refund!
  const canReinstate = order.cancelReason === "EXPIRED";

  if (!canReinstate) {
    console.warn(
      `[handleLatePayment] Order ${order.id} was cancelled with reason "${order.cancelReason || "null"}". Not reinstating; issuing auto-refund via Stripe.`
    );

    try {
      const refund = await stripe.refunds.create(
        { payment_intent: piId },
        { idempotencyKey: `ref_${piId}_${order.id}` }
      );

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "REFUNDED",
          stockReserved: false,
        },
      });

      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "CANCELLED",
          note: `Late payment received for order cancelled with reason "${order.cancelReason || "CUSTOMER/ADMIN"}". Automatic Stripe refund issued (Refund ID: ${refund.id}).`,
        },
      });

      return { success: true, count: 1, orderId: order.id, status: "CANCELLED", reason: "REFUNDED" };
    } catch (refundErr: any) {
      console.error(`🚨 [handleLatePayment - REFUND FAILED] Failed to refund non-expired order ${order.id}:`, refundErr);

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "MANUAL_REVIEW",
          paymentStatus: "PAID",
          stockReserved: false,
          manualReviewReason: "LATE_PAYMENT_NON_EXPIRED_REFUND_FAILED",
        },
      });

      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "MANUAL_REVIEW",
          note: `Late payment received for order cancelled by ${order.cancelReason || "CUSTOMER/ADMIN"}, and auto-refund failed (${refundErr.message}). Placed in MANUAL_REVIEW for merchant intervention.`,
        },
      });

      try {
        const { sendAdminAlertEmail } = await import("@/lib/services/email");
        await sendAdminAlertEmail(
          `Auto-Refund Failed for Cancelled Order #${order.orderNumber}`,
          `A late Stripe payment (${piId}) arrived for cancelled order #${order.orderNumber} (reason: ${order.cancelReason}), but the automatic refund failed: ${refundErr.message}. Order placed in MANUAL_REVIEW.`,
          { orderId: order.id, paymentIntentId: piId, error: refundErr.message }
        );
      } catch {}

      Sentry.captureException(refundErr, {
        extra: {
          orderId: order.id,
          paymentIntentId: piId,
          cancelReason: order.cancelReason,
        },
      });

      return { success: false, count: 0, orderId: order.id, status: "MANUAL_REVIEW", reason: "REFUND_FAILED" };
    }
  }

  // EXPIRED order: Try to reinstate if stock allows; otherwise auto-refund
  try {
    await prisma.$transaction(async (tx) => {
      // Claim the order first with updateMany; continue ONLY if count > 0
      const claimResult = await tx.order.updateMany({
        where: {
          id: order.id,
          status: "CANCELLED",
          paymentStatus: { notIn: ["PAID", "REFUNDED"] },
        },
        data: {
          status: "PROCESSING",
          paymentStatus: "PAID",
          stockReserved: true,
          manualReviewReason: null,
        },
      });

      if (claimResult.count === 0) {
        throw new Error("ORDER_ALREADY_CLAIMED");
      }

      await decrementStockWithLock(
        tx,
        order.items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
        }))
      );

      // Re-reserve the coupon
      if (order.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "PAID",
          note: `Late payment confirmed via Stripe (PI: ${piId}). Stock successfully re-reserved and order reinstated to PROCESSING.`,
        },
      });
    });

    console.warn(
      `[Stripe - Late Payment REINSTATED] Order ${order.id} was CANCELLED, but payment succeeded (${piId}). Stock re-reserved and order reinstated.`
    );

    try {
      const { sendOrderConfirmationEmail } = await import("@/lib/services/email");
      await sendOrderConfirmationEmail(order.id);
    } catch (emailErr) {
      console.error("[handleLatePayment] Failed to dispatch order confirmation email on reinstatement:", emailErr);
    }

    return { success: true, count: 1, orderId: order.id, status: "PROCESSING" };
  } catch (stockErr: any) {
    if (stockErr.message === "ORDER_ALREADY_CLAIMED") {
      return { success: false, count: 0, orderId: order.id };
    }

    // ONLY InsufficientStockError triggers refund. Other errors rethrow so caller retries.
    const isInsufficientStock =
      stockErr instanceof InsufficientStockError ||
      stockErr.name === "InsufficientStockError" ||
      Boolean(
        stockErr.message?.toLowerCase().includes("out of stock") ||
        stockErr.message?.toLowerCase().includes("left in stock")
      );

    if (!isInsufficientStock) {
      console.error(
        `[handleLatePayment] Unexpected non-stock error during late-payment reinstatement for order ${order.id}. Rethrowing:`,
        stockErr
      );
      throw stockErr;
    }

    console.error(
      `🚨 [handleLatePayment - OUT OF STOCK] Order ${order.id} was CANCELLED and payment succeeded (${piId}), but items are out of stock. Triggering auto-refund:`,
      stockErr.message
    );

    try {
      const refund = await stripe.refunds.create(
        { payment_intent: piId },
        { idempotencyKey: `ref_${piId}_${order.id}` }
      );

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "REFUNDED",
          stockReserved: false,
        },
      });

      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "CANCELLED",
          note: `Late payment received for CANCELLED order, but stock was no longer available. Auto-refund issued via Stripe (Refund ID: ${refund.id}).`,
        },
      });

      return { success: true, count: 1, orderId: order.id, status: "CANCELLED", reason: "REFUNDED" };
    } catch (refundErr: any) {
      console.error(
        `🚨 [handleLatePayment - AUTO-REFUND FAILED] Failed to issue refund for order ${order.id} (${piId}):`,
        refundErr
      );

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "MANUAL_REVIEW",
          paymentStatus: "PAID",
          stockReserved: false,
          manualReviewReason: "LATE_PAYMENT_OUT_OF_STOCK_REFUND_FAILED",
        },
      });

      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "MANUAL_REVIEW",
          note: `Late payment received for CANCELLED order, items out of stock, and auto-refund failed (${refundErr.message}). Placed in MANUAL_REVIEW for merchant review.`,
        },
      });

      try {
        const { sendAdminAlertEmail } = await import("@/lib/services/email");
        await sendAdminAlertEmail(
          `Auto-Refund Failed for Order #${order.orderNumber}`,
          `A late Stripe payment (${piId}) arrived for CANCELLED order #${order.orderNumber}, but items were out of stock and the automatic Stripe refund failed (${refundErr.message}). Order placed in MANUAL_REVIEW for immediate manual merchant refund.`,
          { orderId: order.id, paymentIntentId: piId, error: refundErr.message }
        );
      } catch (emailErr) {
        console.error("[handleLatePayment] Failed to dispatch admin alert email on refund failure:", emailErr);
      }

      Sentry.captureException(refundErr, {
        extra: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentIntentId: piId,
          reason: "Auto-refund failed for out-of-stock late Stripe payment",
        },
      });

      return { success: false, count: 0, orderId: order.id, status: "MANUAL_REVIEW", reason: "REFUND_FAILED" };
    }
  }
}

/**
 * Shared atomic confirmation for Stripe payments.
 * - Verifies payment amount and currency against expected order total (in smallest unit).
 * - If mismatched, transitions order to MANUAL_REVIEW (holding stock) and alerts admin.
 * - If order is CANCELLED, delegates to shared handleLatePayment.
 * - Otherwise executes conditional updateMany (PENDING -> PAID, not CANCELLED),
 *   records orderStatusHistory, and dispatches customer confirmation email ONLY if count > 0.
 * Used by Stripe webhook, cleanup cron, and checkout success.
 */
export async function confirmStripePayment(
  orderIdOrIntentId: string,
  options?: ConfirmStripePaymentOptions
): Promise<ConfirmStripePaymentResult> {
  const { prisma } = await import("@/lib/db/prisma");

  // 1. Locate candidate order by ID or stripePaymentIntentId
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: orderIdOrIntentId },
        { stripePaymentIntentId: orderIdOrIntentId },
      ],
    },
    include: { items: true },
  });

  if (!order) {
    return { success: false, count: 0, orderId: undefined };
  }

  // 2. Verify payment amount and currency FIRST (before cancelled-order branch)
  if (options?.amount !== undefined && options?.currency !== undefined) {
    const expectedSmallestUnit = toStripeSmallestUnit(Number(order.total), order.currency);
    const isAmountMatch = options.amount === expectedSmallestUnit;
    const isCurrencyMatch = options.currency.toLowerCase() === order.currency.toLowerCase();

    if (!isAmountMatch || !isCurrencyMatch) {
      console.error(
        `🚨 [confirmStripePayment - AMOUNT MISMATCH] Order #${order.orderNumber} expected ${order.currency} ${expectedSmallestUnit} smallest unit, received ${options.currency?.toUpperCase()} ${options.amount}. Moving to MANUAL_REVIEW.`
      );

      await prisma.$transaction(async (tx) => {
        await tx.order.updateMany({
          where: { id: order.id, status: { notIn: ["MANUAL_REVIEW", "PAID"] } },
          data: {
            status: "MANUAL_REVIEW",
            paymentStatus: "PAID",
            stockReserved: order.stockReserved,
            manualReviewReason: "STRIPE_AMOUNT_MISMATCH",
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: "MANUAL_REVIEW",
            note: `Payment amount or currency mismatch for Stripe PI ${options.paymentIntentId || order.stripePaymentIntentId}. Expected ${order.currency} ${expectedSmallestUnit} smallest unit, received ${options.currency?.toUpperCase()} ${options.amount}. Placed in MANUAL_REVIEW.`,
          },
        });
      });

      try {
        const { sendAdminAlertEmail } = await import("@/lib/services/email");
        await sendAdminAlertEmail(
          `Stripe Payment Amount Mismatch - Order #${order.orderNumber}`,
          `Order #${order.orderNumber} received Stripe payment ${options.paymentIntentId || order.stripePaymentIntentId} with mismatch: expected ${order.currency} ${expectedSmallestUnit} smallest unit, received ${options.currency?.toUpperCase()} ${options.amount}. Placed in MANUAL_REVIEW.`,
          { orderId: order.id, expected: expectedSmallestUnit, received: options.amount }
        );
      } catch {}

      Sentry.captureMessage(
        `Stripe payment amount mismatch for order #${order.orderNumber}`,
        {
          level: "error",
          extra: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            expected: expectedSmallestUnit,
            received: options.amount,
            currency: options.currency,
          },
        }
      );

      return {
        success: false,
        count: 0,
        orderId: order.id,
        status: "MANUAL_REVIEW",
        reason: "STRIPE_AMOUNT_MISMATCH",
      };
    }
  }

  // 3. If the order is CANCELLED, invoke the shared late-payment handler
  if (order.status === "CANCELLED") {
    return await handleLatePayment(order, options);
  }

  // 4. Conditional atomic update: only transitions if paymentStatus is PENDING and not CANCELLED
  const result = await prisma.$transaction(async (tx) => {
    const updateRes = await tx.order.updateMany({
      where: {
        id: order.id,
        paymentStatus: "PENDING",
        status: { not: "CANCELLED" },
      },
      data: {
        paymentStatus: "PAID",
        status: "PROCESSING",
        ...(options?.paymentIntentId ? { stripePaymentIntentId: options.paymentIntentId } : {}),
      },
    });

    if (updateRes.count > 0) {
      const piId = options?.paymentIntentId || order.stripePaymentIntentId || "";
      const amountStr = options?.amount
        ? `Amount: ${options.currency?.toUpperCase() || ""} ${(options.amount / 100).toFixed(2)}, `
        : "";
      const sourceStr = options?.source ? ` via ${options.source}` : "";

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "PAID",
          note: `Payment confirmed via Stripe${sourceStr} (${amountStr}PI: ${piId})`,
        },
      });
    }

    return { count: updateRes.count, orderId: order.id };
  });

  if (result.count > 0 && result.orderId) {
    try {
      const { sendOrderConfirmationEmail } = await import("@/lib/services/email");
      await sendOrderConfirmationEmail(result.orderId);
    } catch (emailErr) {
      console.error(`[confirmStripePayment] Failed to send order confirmation email for order ${result.orderId}:`, emailErr);
    }
    return { success: true, count: result.count, orderId: result.orderId, status: "PROCESSING" };
  }

  return { success: false, count: 0, orderId: result.orderId };
}
