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
async function handleCleanup(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  // Enforce CRON_SECRET authorization: return 401 if missing or mismatched
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized: Missing or invalid CRON_SECRET authorization header." },
      { status: 401 }
    );
  }

  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  // Query pending online gateway orders older than 30 minutes (never touches COD)
  const expiredOrders = await prisma.order.findMany({
    where: {
      paymentMethod: { in: ["STRIPE", "KHALTI"] },
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

      // 1. Inspect PaymentIntent on Stripe if attached
      if (order.paymentMethod === "STRIPE" && order.stripePaymentIntentId) {
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

          // Cancel the Stripe PaymentIntent across all cancellable states
          if (
            [
              "requires_payment_method",
              "requires_confirmation",
              "requires_action",
              "requires_capture",
            ].includes(intent.status)
          ) {
            await stripe.paymentIntents.cancel(order.stripePaymentIntentId, {
              cancellation_reason: "abandoned",
            });
          }
        } catch (stripeErr: any) {
          // If already canceled, proceed; otherwise warn and skip
          if (
            stripeErr.code !== "resource_missing" &&
            !stripeErr.message?.includes("already been canceled")
          ) {
            console.warn(
              `[Stripe Cleanup] Failed to cancel intent ${order.stripePaymentIntentId}:`,
              stripeErr.message
            );
            isCancellable = false;
            results.errors.push(`Order ${order.id}: ${stripeErr.message}`);
            continue;
          }
        }
      } else if (order.paymentMethod === "KHALTI") {
        // Khalti ePayment v2 pidx expires on Khalti's gateway; treating expired Khalti pidx as dead
        console.log(
          `[Khalti Cleanup] Order ${order.id} (pidx: ${order.khaltiPidx || "N/A"}) expired. Treating pidx as dead.`
        );
      }

      if (!isCancellable) {
        continue;
      }

      // Execute atomic conditional release:
      // releaseOrderStock verifies WHERE status IN ('PENDING', 'PENDING_VERIFICATION', 'PROCESSING', 'MANUAL_REVIEW')
      // and paymentStatus != 'PAID' via { requireNonPaid: true }
      await prisma.$transaction(async (tx) => {
        const release = await releaseOrderStock(
          tx,
          order.id,
          "Reservation expired (30-min TTL). Order cancelled and stock restored.",
          { requireNonPaid: true }
        );

        if (release.success) {
          await tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: "FAILED",
            },
          });

          results.cancelled++;
        } else {
          results.skippedOrRaced++;
        }
      });
    } catch (orderErr: any) {
      console.error(`[Expiry Cleanup] Error processing order ${order.id}:`, orderErr);
      results.errors.push(`Order ${order.id}: ${orderErr.message}`);
    }
  }

  return NextResponse.json({
    message: "Expired order cleanup completed",
    results,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  return handleCleanup(request);
}

export async function POST(request: NextRequest) {
  return handleCleanup(request);
}

