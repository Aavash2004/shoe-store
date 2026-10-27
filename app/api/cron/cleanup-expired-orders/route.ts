import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { stripe, confirmStripePayment } from "@/lib/services/stripe";
import { lookupKhaltiPayment } from "@/lib/services/khalti";
import { releaseOrderStock } from "@/lib/checkout/stock";

export const dynamic = "force-dynamic";

/**
 * 30-Minute Reservation TTL Cleanup Worker
 * Identifies abandoned Stripe and Khalti checkout sessions, verifies gateway state,
 * confirms completed payments, and atomically releases reserved stock back into inventory
 * for genuinely expired or abandoned orders.
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

  if (expiredOrders.length === 50) {
    console.warn(
      "⚠️ [Cleanup Cron Warning] Expired orders batch reached the 50 limit. Additional expired orders may be pending next run."
    );
  }

  const results = {
    evaluated: expiredOrders.length,
    cancelled: 0,
    skippedOrRaced: 0,
    confirmed: 0,
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

          // If the intent has succeeded, confirm payment (e.g. if webhook was delayed/missed)
          if (intent.status === "succeeded") {
            const confirmRes = await confirmStripePayment(order.id, {
              paymentIntentId: order.stripePaymentIntentId,
              amount: intent.amount,
              currency: intent.currency,
              source: "cleanup_cron",
            });
            if (confirmRes.count > 0) {
              results.confirmed++;
            }
            isCancellable = false;
            results.skippedOrRaced++;
            continue;
          }

          if (intent.status === "processing") {
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
          // If already canceled, proceed; otherwise skip and retry next run
          if (
            stripeErr.code !== "resource_missing" &&
            !stripeErr.message?.includes("already been canceled")
          ) {
            console.warn(
              `[Stripe Cleanup] Failed to retrieve/cancel intent ${order.stripePaymentIntentId}:`,
              stripeErr.message
            );
            isCancellable = false;
            results.skippedOrRaced++;
            results.errors.push(`Order ${order.id}: ${stripeErr.message}`);
            continue;
          }
        }
      } else if (order.paymentMethod === "KHALTI" && order.khaltiPidx) {
        // 2. Call Khalti Lookup API on pidx before expiring
        try {
          const lookupResult = await lookupKhaltiPayment(order.khaltiPidx);

          if (lookupResult.status === "Completed") {
            const expectedPaisa = Math.round(Number(order.total) * 100);

            // Verify payment amount matches order total exactly
            if (Number(lookupResult.total_amount) !== expectedPaisa) {
              console.error(
                `🚨 [Cleanup Cron] Khalti payment amount mismatch detected for order ${order.id} (${order.orderNumber})!\n` +
                `Expected: ${expectedPaisa} paisa, Received: ${lookupResult.total_amount} paisa.`
              );

              await prisma.$transaction(async (tx) => {
                await tx.order.update({
                  where: { id: order.id },
                  data: {
                    status: "MANUAL_REVIEW",
                    transactionId: lookupResult.transaction_id || order.khaltiPidx,
                    stockReserved: true,
                    manualReviewReason: "KHALTI_AMOUNT_MISMATCH",
                  },
                });

                await tx.orderStatusHistory.create({
                  data: {
                    orderId: order.id,
                    status: "MANUAL_REVIEW",
                    note: `🚨 Payment amount mismatch detected during cleanup cron: expected ${expectedPaisa} paisa, received ${lookupResult.total_amount} paisa. Order held for manual review. Stock and promo code remain reserved.`,
                  },
                });
              });

              try {
                const { sendAdminAlertEmail } = await import("@/lib/services/email");
                await sendAdminAlertEmail(
                  `🚨 SECURITY ALERT: Khalti payment amount mismatch during cron for Order #${order.orderNumber}`,
                  `Order #${order.orderNumber} placed in MANUAL_REVIEW during cleanup cron due to Khalti payment amount mismatch. Expected: Rs. ${order.total}, Received: Rs. ${(Number(lookupResult.total_amount) / 100).toFixed(2)}. Stock and promo code remain reserved.`,
                  { orderId: order.id, pidx: order.khaltiPidx, expected: order.total, received: lookupResult.total_amount }
                );
              } catch (alertErr) {
                console.error("[Cleanup Cron] Failed to send admin alert email:", alertErr);
              }

              results.skippedOrRaced++;
              continue;
            }

            // Normal confirmation path for completed Khalti payment
            const updateCount = await prisma.$transaction(async (tx) => {
              const res = await tx.order.updateMany({
                where: { id: order.id, paymentStatus: { not: "PAID" } },
                data: {
                  paymentStatus: "PAID",
                  status: "PROCESSING",
                  transactionId: lookupResult.transaction_id || order.khaltiPidx,
                },
              });

              if (res.count > 0) {
                await tx.orderStatusHistory.create({
                  data: {
                    orderId: order.id,
                    status: "PAID",
                    note: `Payment verified by cleanup worker via Khalti (Txn ID: ${lookupResult.transaction_id}, Amount: NPR ${(
                      lookupResult.total_amount / 100
                    ).toFixed(2)})`,
                  },
                });
              }
              return res.count;
            });

            if (updateCount > 0) {
              try {
                const { sendOrderConfirmationEmail } = await import("@/lib/services/email");
                await sendOrderConfirmationEmail(order.id);
              } catch (emailErr) {
                console.error(`[Cleanup Cron] Failed to dispatch confirmation email for order ${order.id}:`, emailErr);
              }
              results.confirmed++;
            }

            results.skippedOrRaced++;
            continue;
          }
        } catch (khaltiErr: any) {
          // If lookup fails, skip the order and retry next run
          console.warn(
            `[Khalti Cleanup] Lookup failed for pidx ${order.khaltiPidx}:`,
            khaltiErr.message
          );
          results.skippedOrRaced++;
          results.errors.push(`Order ${order.id} Khalti lookup failed: ${khaltiErr.message}`);
          continue;
        }
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
          { requireNonPaid: true, cancelReason: "EXPIRED" }
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

