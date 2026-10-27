import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import { stripe, confirmStripePayment } from "@/lib/services/stripe";
import { releaseOrderStock, decrementStockWithLock, InsufficientStockError } from "@/lib/checkout/stock";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  // 1. Next.js App Router MUST read the raw unparsed text for signature verification
  const rawBody = await request.text();

  // 2. Guard against missing or null signature header
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Stripe Webhook] Missing STRIPE_WEBHOOK_SECRET in environment");
    return NextResponse.json(
      { error: "Webhook secret not configured on server" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error("[Stripe Webhook Verification Error]:", err.message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    );
  }

  // 3. Process authorized events
  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const paymentIntentId = paymentIntent.id;

        // Use shared atomic payment confirmation (handles verification, normal payment, and late payment)
        await confirmStripePayment(paymentIntentId, {
          paymentIntentId,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          source: "Webhook",
        });
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const paymentIntentId = paymentIntent.id;
        const failureMessage =
          paymentIntent.last_payment_error?.message || "Payment attempt failed.";

        const order = await prisma.order.findUnique({
          where: { stripePaymentIntentId: paymentIntentId },
        });

        if (order && order.paymentStatus === "PENDING") {
          // Keep stock and coupon reserved to allow customer retry; record failure note in history
          await prisma.orderStatusHistory.create({
            data: {
              orderId: order.id,
              status: "PENDING",
              note: `Payment attempt failed: ${failureMessage}. Order remains PENDING to allow customer retry.`,
            },
          });
        }
        break;
      }

      case "payment_intent.canceled": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const paymentIntentId = paymentIntent.id;

        const order = await prisma.order.findUnique({
          where: { stripePaymentIntentId: paymentIntentId },
        });

        if (order && order.status !== "CANCELLED") {
          // Derive cancelReason from Stripe cancellation_reason
          let derivedReason: "EXPIRED" | "CUSTOMER" | "ADMIN" = "CUSTOMER";
          if (paymentIntent.cancellation_reason === "abandoned") {
            derivedReason = "EXPIRED";
          } else if (
            paymentIntent.cancellation_reason === "fraudulent" ||
            paymentIntent.cancellation_reason === "duplicate"
          ) {
            derivedReason = "ADMIN";
          }

          // Never overwrite an existing cancelReason
          const finalReason = (order.cancelReason as "EXPIRED" | "CUSTOMER" | "ADMIN") || derivedReason;

          await prisma.$transaction(async (tx) => {
            await releaseOrderStock(
              tx,
              order.id,
              `PaymentIntent was canceled on Stripe (${paymentIntent.cancellation_reason || "unspecified"}).`,
              { requireNonPaid: true, cancelReason: finalReason }
            );
          });
        }
        break;
      }

      default: {
        // Other events can be safely acknowledged
        break;
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error(`[Stripe Webhook Handler Error - ${event.type}]:`, err);
    return NextResponse.json(
      { error: "Webhook handler encountered internal error" },
      { status: 500 }
    );
  }
}
