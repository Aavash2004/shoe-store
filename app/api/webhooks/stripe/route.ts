import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import { stripe } from "@/lib/services/stripe";
import { releaseOrderStock, decrementStockWithLock } from "@/lib/checkout/stock";

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
            status: { not: "CANCELLED" },
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
              const emailResult = await sendOrderConfirmationEmail(updatedOrder.id);
              if (!emailResult?.success) {
                console.error(`[Stripe Webhook] Order confirmation email dispatch failed for order ${updatedOrder.id}:`, emailResult?.error);
              }
            } catch (emailErr) {
              console.error("[Stripe Webhook] Failed to dispatch order confirmation email:", emailErr);
            }
          }
        } else {
          // Check if the order was previously CANCELLED (e.g. expired by cron)
          const existingOrder = await prisma.order.findUnique({
            where: { stripePaymentIntentId: paymentIntentId },
            include: { items: true },
          });

          if (
            existingOrder &&
            existingOrder.status === "CANCELLED" &&
            existingOrder.paymentStatus !== "PAID" &&
            existingOrder.paymentStatus !== "REFUNDED"
          ) {
            // Late payment on a CANCELLED order: Try to reinstate if stock allows; otherwise auto-refund
            try {
              await prisma.$transaction(async (tx) => {
                await decrementStockWithLock(
                  tx,
                  existingOrder.items.map((i) => ({
                    variantId: i.variantId,
                    quantity: i.quantity,
                  }))
                );

                await tx.order.update({
                  where: { id: existingOrder.id },
                  data: {
                    status: "PROCESSING",
                    paymentStatus: "PAID",
                  },
                });

                await tx.orderStatusHistory.create({
                  data: {
                    orderId: existingOrder.id,
                    status: "PAID",
                    note: `Late payment confirmed via Stripe (PI: ${paymentIntentId}). Stock successfully re-reserved and order reinstated to PROCESSING.`,
                  },
                });
              });

              console.warn(
                `[Stripe Webhook - Late Payment REINSTATED] Order ${existingOrder.id} was CANCELLED, but payment succeeded (${paymentIntentId}). Stock re-reserved and order reinstated.`
              );

              try {
                const { sendOrderConfirmationEmail } = await import("@/lib/services/email");
                await sendOrderConfirmationEmail(existingOrder.id);
              } catch (emailErr) {
                console.error("[Stripe Webhook] Failed to dispatch order confirmation email on reinstatement:", emailErr);
              }
            } catch (stockErr: any) {
              console.error(
                `🚨 [Stripe Webhook - Late Payment OUT OF STOCK] Order ${existingOrder.id} was CANCELLED and payment succeeded (${paymentIntentId}), but items are out of stock. Triggering auto-refund:`,
                stockErr.message
              );

              try {
                const refund = await stripe.refunds.create({
                  payment_intent: paymentIntentId,
                });

                await prisma.order.update({
                  where: { id: existingOrder.id },
                  data: {
                    paymentStatus: "REFUNDED",
                  },
                });

                await prisma.orderStatusHistory.create({
                  data: {
                    orderId: existingOrder.id,
                    status: "CANCELLED",
                    note: `Late payment received for CANCELLED order, but stock was no longer available. Auto-refund issued via Stripe (Refund ID: ${refund.id}).`,
                  },
                });

                console.log(
                  `[Stripe Webhook - Auto-Refund Successful] Refund ${refund.id} issued for order ${existingOrder.id}.`
                );
              } catch (refundErr: any) {
                console.error(
                  `🚨 [Stripe Webhook - AUTO-REFUND FAILED] Failed to issue refund for order ${existingOrder.id} (${paymentIntentId}):`,
                  refundErr
                );
              }
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
          await prisma.$transaction(async (tx) => {
            await releaseOrderStock(
              tx,
              order.id,
              "PaymentIntent was canceled on Stripe.",
              { requireNonPaid: true }
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
