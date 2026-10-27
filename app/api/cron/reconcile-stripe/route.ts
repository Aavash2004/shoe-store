import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { stripe, confirmStripePayment } from "@/lib/services/stripe";
import * as Sentry from "@sentry/nextjs";
import path from "path";
import fs from "fs/promises";

export const dynamic = "force-dynamic";

const STATE_FILE_PATH = path.join(process.cwd(), "data", "stripe-reconcile-state.json");

/**
 * Retrieves the persisted timestamp of the previous reconciliation sweep.
 * Defaults to 24 hours ago if no previous scan timestamp is stored.
 */
async function getLastScannedTimestamp(): Promise<number> {
  try {
    const raw = await fs.readFile(STATE_FILE_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (typeof data.lastScannedAt === "number") {
      return data.lastScannedAt;
    }
  } catch {
    // File doesn't exist yet or unreadable; default to 24 hours ago
  }
  return Date.now() - 24 * 60 * 60 * 1000;
}

/**
 * Persists the latest reconciliation sweep timestamp.
 */
async function setLastScannedTimestamp(timestamp: number): Promise<void> {
  try {
    await fs.mkdir(path.dirname(STATE_FILE_PATH), { recursive: true });
    await fs.writeFile(
      STATE_FILE_PATH,
      JSON.stringify({ lastScannedAt: timestamp, updatedAt: new Date().toISOString() }),
      "utf-8"
    );
  } catch (err) {
    console.warn("[Stripe Reconciliation] Failed to persist lastScannedAt to disk:", err);
  }
}

/**
 * Automated Stripe Reconciliation Sweep Cron
 *
 * Requirements:
 * 1. Persisted last-scanned time (resumes where it left off, avoiding redundant historical sweeps).
 * 2. Only processes PaymentIntents carrying our application's order metadata.
 * 3. Triggers critical alerts for orphan succeeded payments (no corresponding order in database).
 * 4. Calls confirmStripePayment for unpaid orders to recover stranded or missed-webhook transactions.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  // Enforce CRON_SECRET authorization unless in test mode
  const isTest = process.env.NODE_ENV === "test";
  if (!isTest && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
    return NextResponse.json(
      { error: "Unauthorized: Missing or invalid CRON_SECRET authorization header." },
      { status: 401 }
    );
  }

  const sweepStartTime = Date.now();
  const lastScannedMs = await getLastScannedTimestamp();
  const lastScannedSec = Math.floor(lastScannedMs / 1000);

  const results = {
    scanned: 0,
    matchedIntents: 0,
    confirmed: 0,
    orphaned: 0,
    errors: [] as string[],
    lastScannedBefore: new Date(lastScannedMs).toISOString(),
    lastScannedAfter: new Date(sweepStartTime).toISOString(),
  };

  try {
    // List PaymentIntents created since last sweep (max 100 per tick)
    const intentsList = await stripe.paymentIntents.list({
      created: { gte: lastScannedSec },
      limit: 100,
    });

    results.scanned = intentsList.data.length;

    for (const pi of intentsList.data) {
      // 2. Filter: Only process PaymentIntents carrying our order metadata
      const metaOrderId = pi.metadata?.orderId;
      const metaOrderNumber = pi.metadata?.orderNumber;
      const isStoreIntent = Boolean(metaOrderId || metaOrderNumber || pi.metadata?.store === "shoe-store");

      if (!isStoreIntent) {
        continue;
      }

      results.matchedIntents++;

      // Only evaluate succeeded payments
      if (pi.status !== "succeeded") {
        continue;
      }

      // 3. Locate matching Order in database
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            ...(metaOrderId ? [{ id: metaOrderId }] : []),
            ...(metaOrderNumber ? [{ orderNumber: metaOrderNumber }] : []),
            { stripePaymentIntentId: pi.id },
          ],
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          total: true,
          currency: true,
        },
      });

      // 3a. Orphan Alert: Succeeded PaymentIntent has our metadata, but no order exists!
      if (!order) {
        results.orphaned++;
        const alertMsg = `🚨 [ORPHAN STRIPE PAYMENT] PaymentIntent ${pi.id} (${pi.currency?.toUpperCase()} ${(pi.amount / 100).toFixed(2)}) has shoe-store metadata (orderId: ${metaOrderId || "none"}, orderNumber: ${metaOrderNumber || "none"}) but NO matching order exists in database!`;
        console.error(alertMsg);

        try {
          const { sendAdminAlertEmail } = await import("@/lib/services/email");
          await sendAdminAlertEmail(
            `ORPHAN Stripe Payment Detected: ${pi.id}`,
            alertMsg,
            { paymentIntentId: pi.id, amount: pi.amount, currency: pi.currency, metadata: pi.metadata }
          );
        } catch (mailErr) {
          console.error("[Stripe Reconciliation] Failed to send orphan alert email:", mailErr);
        }

        Sentry.captureMessage(alertMsg, {
          level: "fatal",
          extra: {
            paymentIntentId: pi.id,
            amount: pi.amount,
            currency: pi.currency,
            metadata: pi.metadata,
          },
        });

        continue;
      }

      // 4. If the order exists and is not yet marked as PAID, confirm it idempotently
      if (order.paymentStatus !== "PAID") {
        console.log(
          `[Stripe Reconciliation] Recovering unpaid order #${order.orderNumber} (${order.id}) via succeeded PI ${pi.id}`
        );

        const confirmRes = await confirmStripePayment(order.id, {
          paymentIntentId: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          source: "reconciliation_sweep",
        });

        if (confirmRes.success && confirmRes.count > 0) {
          results.confirmed++;
        }
      }
    }

    // Persist sweep timestamp
    await setLastScannedTimestamp(sweepStartTime);

    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (err: any) {
    console.error("[Stripe Reconciliation Sweep Error]:", err);
    Sentry.captureException(err, { tags: { component: "stripe_reconciliation_cron" } });
    return NextResponse.json(
      { success: false, error: err.message, results },
      { status: 500 }
    );
  }
}
