import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import { stripe } from "@/lib/services/stripe";
import { releaseOrderStock } from "@/lib/checkout/stock";

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

        // Atomic conditional state transition:
        // Only updates if paymentStatus is currently PENDING.
        // Prevents duplicate webhooks or concurrent cron races from double-processing.
        const updateResult = await prisma.order.updateMany({
          where: {
            stripePaymentIntentId: paymentIntentId,
            paymentStatus: "PENDING",
          },
          data: {
            paymentStatus: "PAID",
            status: "PROCESSING",
          },
        });

        if (updateResult.count > 0) {
          const updatedOrder = await prisma.order.findUnique({
            where: { stripePaymentIntentId: paymentIntentId },
          });

          if (updatedOrder) {
            if (updatedOrder.couponCode) {
              await prisma.coupon.updateMany({
                where: { code: updatedOrder.couponCode },
                data: { usedCount: { increment: 1 } },
              });
            }

            await prisma.orderStatusHistory.create({
              data: {
                orderId: updatedOrder.id,
                status: "PAID",
                note: `Payment confirmed via Stripe (Amount: ${paymentIntent.currency.toUpperCase()} ${(
                  paymentIntent.amount / 100
                ).toFixed(2)}, PI: ${paymentIntentId})`,
              },
            });

            // Send transactional order confirmation email
            try {
              const { sendOrderConfirmationEmail } = await import("@/lib/services/email");
              await sendOrderConfirmationEmail(updatedOrder.id);
            } catch (emailErr) {
              console.warn("[Stripe Webhook] Failed to dispatch order confirmation email:", emailErr);
            }
          }
        }
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
          // Release reserved inventory idempotently
          await prisma.$transaction(async (tx) => {
            const released = await releaseOrderStock(tx, order.id);
            if (released.success) {
              await tx.order.update({
                where: { id: order.id },
                data: {
                  paymentStatus: "FAILED",
                  status: "CANCELLED",
                },
              });

              await tx.orderStatusHistory.create({
                data: {
                  orderId: order.id,
                  status: "FAILED",
                  note: `Payment failed: ${failureMessage}. Inventory safely released.`,
                },
              });
            }
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
          await prisma.$transaction(async (tx) => {
            const released = await releaseOrderStock(tx, order.id);
            if (released.success) {
              await tx.orderStatusHistory.create({
                data: {
                  orderId: order.id,
                  status: "CANCELLED",
                  note: `PaymentIntent was canceled on Stripe. Inventory safely released.`,
                },
              });
            }
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
