import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { stripe } from "@/lib/services/stripe";
import { releaseOrderStock } from "@/lib/checkout/stock";

export const dynamic = "force-dynamic";

/**
 * 30-Minute Reservation TTL Cleanup Worker
 * Identifies abandoned Stripe checkout sessions, cancels the PaymentIntent,
 * and atomically releases reserved stock back into inventory.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  // Enforce CRON_SECRET authorization in production
  if (process.env.NODE_ENV === "production") {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized cron execution" },
        { status: 401 }
      );
    }
  }

  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  // Query pending Stripe orders older than 30 minutes
  const expiredOrders = await prisma.order.findMany({
    where: {
      paymentMethod: "STRIPE",
      paymentStatus: "PENDING",
      status: "PENDING",
      createdAt: {
        lt: thirtyMinutesAgo,
      },
    },
    include: {
      items: true,
    },
    take: 50, // Batch limit per cron tick
  });

  const results = {
    evaluated: expiredOrders.length,
    cancelled: 0,
    skippedOrRaced: 0,
    errors: [] as string[],
  };

  for (const order of expiredOrders) {
    try {
      let isCancellable = true;

      // Inspect PaymentIntent on Stripe if attached
      if (order.stripePaymentIntentId) {
        try {
          const intent = await stripe.paymentIntents.retrieve(
            order.stripePaymentIntentId
          );

          // If the intent has already succeeded or processing, do not cancel
          if (intent.status === "succeeded" || intent.status === "processing") {
            isCancellable = false;
            results.skippedOrRaced++;
            continue;
          }

          // Only attempt cancellation if the intent is in an abandonable state
          if (intent.status === "requires_payment_method") {
            await stripe.paymentIntents.cancel(order.stripePaymentIntentId, {
              cancellation_reason: "abandoned",
            });
          } else if (intent.status === "requires_action") {
            // Customer is mid-3DS or user action; skip cancellation to avoid interrupting legitimate payment
            isCancellable = false;
            results.skippedOrRaced++;
            continue;
          }
        } catch (stripeErr: any) {
          console.warn(
            `[Stripe Cleanup] Failed to cancel intent ${order.stripePaymentIntentId}:`,
            stripeErr.message
          );
          // Skip stock release if intent cancellation failed to avoid premature restock
          isCancellable = false;
          results.errors.push(`Order ${order.id}: ${stripeErr.message}`);
          continue;
        }
      }

      if (!isCancellable) {
        continue;
      }

      // Execute atomic conditional release:
      // releaseOrderStock verifies WHERE status IN ('PENDING', 'PENDING_VERIFICATION', 'PROCESSING')
      // and transitions status = 'CANCELLED'.
      // If a webhook raced and already marked status = 'PROCESSING' or paymentStatus = 'PAID',
      // this transaction safely handles the state.
      await prisma.$transaction(async (tx) => {
        // Additional double-check on paymentStatus to avoid racing with payment_intent.succeeded
        const currentOrder = await tx.order.findUnique({
          where: { id: order.id },
          select: { paymentStatus: true, status: true },
        });

        if (
          !currentOrder ||
          currentOrder.paymentStatus !== "PENDING" ||
          currentOrder.status !== "PENDING"
        ) {
          results.skippedOrRaced++;
          return;
        }

        const release = await releaseOrderStock(tx, order.id);
        if (release.success) {
          await tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: "FAILED",
            },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              status: "CANCELLED",
              note: "Reservation expired (30-min TTL). Order cancelled and stock restored.",
            },
          });

          results.cancelled++;
        } else {
          results.skippedOrRaced++;
        }
      });
    } catch (orderErr: any) {
      console.error(`[Stripe Cleanup] Error processing order ${order.id}:`, orderErr);
      results.errors.push(`Order ${order.id}: ${orderErr.message}`);
    }
  }

  return NextResponse.json({
    message: "Expired order cleanup completed",
    results,
    timestamp: new Date().toISOString(),
  });
}
