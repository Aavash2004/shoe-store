import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { lookupKhaltiPayment, refundKhaltiPayment } from "@/lib/services/khalti";
import { releaseOrderStock, decrementStockWithLock } from "@/lib/checkout/stock";
import * as Sentry from "@sentry/nextjs";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const pidx = searchParams.get("pidx");
    const purchaseOrderId = searchParams.get("purchase_order_id");

    const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const supportEmail = process.env.SUPPORT_EMAIL || "support@abxv.com";

    if (!pidx) {
        return NextResponse.redirect(
            `${baseUrl}/checkout?error=${encodeURIComponent("Missing payment token from Khalti.")}`
        );
    }

    // 1. Locate Order by khaltiPidx or purchaseOrderId
    const order = await prisma.order.findFirst({
        where: {
            OR: [
                { khaltiPidx: pidx },
                ...(purchaseOrderId ? [{ id: purchaseOrderId }] : []),
            ],
        },
        include: { items: true },
    });

    if (!order) {
        return NextResponse.redirect(
            `${baseUrl}/checkout?error=${encodeURIComponent("Order not found.")}`
        );
    }

    // If already marked as paid (idempotent sequential return)
    if (order.paymentStatus === "PAID") {
        return NextResponse.redirect(
            `${baseUrl}/order-confirmation/${order.id}`
        );
    }

    try {
        // 2. Server-to-server verification via Khalti Lookup API
        const lookupResult = await lookupKhaltiPayment(pidx);

        const expectedPaisa = Math.round(Number(order.total) * 100);

        if (lookupResult.status === "Completed") {
            // Verify payment amount matches order total exactly
            if (Number(lookupResult.total_amount) !== expectedPaisa) {
                console.error(
                    `🚨 [CRITICAL SECURITY ALERT] Khalti payment amount mismatch detected for order ${order.id} (${order.orderNumber})!\n` +
                    `Expected: ${expectedPaisa} paisa (Rs. ${order.total} NPR)\n` +
                    `Received: ${lookupResult.total_amount} paisa\n` +
                    `Transaction ID: ${lookupResult.transaction_id || pidx}\n` +
                    `ACTION: Order marked for MANUAL_REVIEW. Stock and promo code remain reserved.`
                );

                // Dispatch Sentry alert
                try {
                    Sentry.captureMessage(
                        `🚨 Khalti Payment Amount Mismatch for Order #${order.orderNumber}: expected ${expectedPaisa} paisa, received ${lookupResult.total_amount} paisa`,
                        {
                            level: "fatal",
                            extra: {
                                orderId: order.id,
                                orderNumber: order.orderNumber,
                                expectedPaisa,
                                receivedPaisa: lookupResult.total_amount,
                                pidx,
                                transactionId: lookupResult.transaction_id,
                            },
                        }
                    );
                } catch (sentryErr) {
                    console.error("[Khalti Callback] Failed to capture Sentry alert:", sentryErr);
                }

                await prisma.$transaction(async (tx) => {
                    await tx.order.update({
                        where: { id: order.id },
                        data: {
                            status: "MANUAL_REVIEW",
                            transactionId: lookupResult.transaction_id || pidx,
                        },
                    });

                    await tx.orderStatusHistory.create({
                        data: {
                            orderId: order.id,
                            status: "MANUAL_REVIEW",
                            note: `🚨 Payment amount mismatch: expected ${expectedPaisa} paisa (Rs. ${order.total} NPR), received ${lookupResult.total_amount} paisa. Order held for manual review. Stock and promo code remain reserved.`,
                        },
                    });
                });

                // Dispatch email alert to admin
                try {
                    const { sendShippingUpdateEmail } = await import("@/lib/services/email");
                    await sendShippingUpdateEmail(
                        order.id,
                        `🚨 SECURITY ALERT: Order #${order.orderNumber} placed in MANUAL_REVIEW due to Khalti payment amount mismatch. Expected: Rs. ${order.total}, Received: Rs. ${(Number(lookupResult.total_amount) / 100).toFixed(2)}.`
                    );
                } catch (emailErr) {
                    console.error("[Khalti Callback] Failed to dispatch admin alert email:", emailErr);
                }

                return NextResponse.redirect(
                    `${baseUrl}/checkout?error=${encodeURIComponent(
                        `Payment amount mismatch detected. Order #${order.orderNumber} is held for manual review. Please contact support at ${supportEmail}.`
                    )}&orderNumber=${encodeURIComponent(order.orderNumber)}&supportEmail=${encodeURIComponent(supportEmail)}`
                );
            }

            // Check if the order was previously CANCELLED (e.g. 30-min TTL expired)
            if (order.status === "CANCELLED") {
                // Late payment on a CANCELLED order: Try to reinstate if stock allows; otherwise auto-refund
                try {
                    await prisma.$transaction(async (tx) => {
                        await decrementStockWithLock(
                            tx,
                            order.items.map((i) => ({
                                variantId: i.variantId,
                                quantity: i.quantity,
                            }))
                        );

                        await tx.order.update({
                            where: { id: order.id },
                            data: {
                                status: "PROCESSING",
                                paymentStatus: "PAID",
                                transactionId: lookupResult.transaction_id || pidx,
                            },
                        });

                        await tx.orderStatusHistory.create({
                            data: {
                                orderId: order.id,
                                status: "PAID",
                                note: `Late payment confirmed via Khalti (Txn ID: ${lookupResult.transaction_id || pidx}). Stock successfully re-reserved and order reinstated to PROCESSING.`,
                            },
                        });
                    });

                    console.warn(
                        `[Khalti Callback - Late Payment REINSTATED] Order ${order.id} was CANCELLED, but payment completed (${pidx}). Stock re-reserved and order reinstated.`
                    );

                    try {
                        const { sendOrderConfirmationEmail } = await import("@/lib/services/email");
                        await sendOrderConfirmationEmail(order.id);
                    } catch (emailErr) {
                        console.error("[Khalti Callback] Failed to dispatch order confirmation email on reinstatement:", emailErr);
                    }

                    return NextResponse.redirect(
                        `${baseUrl}/order-confirmation/${order.id}`
                    );
                } catch (stockErr: any) {
                    console.error(
                        `🚨 [Khalti Callback - Late Payment OUT OF STOCK] Order ${order.id} was CANCELLED and payment succeeded (${pidx}), but items are out of stock. Triggering auto-refund:`,
                        stockErr.message
                    );

                    const refundRes = await refundKhaltiPayment(pidx);

                    await prisma.order.update({
                        where: { id: order.id },
                        data: {
                            paymentStatus: "REFUNDED",
                            transactionId: lookupResult.transaction_id || pidx,
                        },
                    });

                    await prisma.orderStatusHistory.create({
                        data: {
                            orderId: order.id,
                            status: "CANCELLED",
                            note: `Late payment received for CANCELLED order, but stock was no longer available. Auto-refund requested via Khalti API (${refundRes.success ? "Refund successful" : refundRes.error}).`,
                        },
                    });

                    return NextResponse.redirect(
                        `${baseUrl}/checkout?error=${encodeURIComponent(
                            `Order #${order.orderNumber} was previously expired and items are now out of stock. A refund has been issued to your Khalti wallet.`
                        )}&orderNumber=${encodeURIComponent(order.orderNumber)}&supportEmail=${encodeURIComponent(supportEmail)}`
                    );
                }
            }

            // 3. Normal Path: Mark Order as PAID and PROCESSING (atomic conditional update for idempotency)
            const updateCount = await prisma.$transaction(async (tx) => {
                const res = await tx.order.updateMany({
                    where: { id: order.id, paymentStatus: { not: "PAID" } },
                    data: {
                        paymentStatus: "PAID",
                        status: "PROCESSING",
                        transactionId: lookupResult.transaction_id || pidx,
                    },
                });

                if (res.count > 0) {
                    await tx.orderStatusHistory.create({
                        data: {
                            orderId: order.id,
                            status: "PAID",
                            note: `Payment verified via Khalti (Txn ID: ${lookupResult.transaction_id}, Amount: NPR ${(
                                lookupResult.total_amount / 100
                            ).toFixed(2)})`,
                        },
                    });
                }
                return res.count;
            });

            // Send transactional email only if this request executed the state transition
            if (updateCount > 0) {
                try {
                    const { sendOrderConfirmationEmail } = await import("@/lib/services/email");
                    const emailResult = await sendOrderConfirmationEmail(order.id);
                    if (!emailResult?.success) {
                        console.error(`[Khalti Callback] Order confirmation email dispatch failed for order ${order.id}:`, emailResult?.error);
                    }
                } catch (emailErr) {
                    console.error("[Khalti Callback] Failed to dispatch order confirmation email:", emailErr);
                }
            }

            return NextResponse.redirect(
                `${baseUrl}/order-confirmation/${order.id}`
            );
        } else {
            // Payment canceled or expired: Release stock and coupon atomically & idempotently ONLY when transitioning to CANCELLED
            await prisma.$transaction(async (tx) => {
                await releaseOrderStock(
                    tx,
                    order.id,
                    `Khalti payment status: ${lookupResult.status}`,
                    { requireNonPaid: true }
                );
                await tx.order.updateMany({
                    where: { id: order.id },
                    data: {
                        paymentStatus: "FAILED",
                    },
                });
            });

            return NextResponse.redirect(
                `${baseUrl}/checkout?error=${encodeURIComponent(
                    `Khalti payment was not completed (${lookupResult.status}).`
                )}`
            );
        }
    } catch (err: any) {
        console.error("[Khalti Callback Verification Error]:", err);
        return NextResponse.redirect(
            `${baseUrl}/checkout?error=${encodeURIComponent(
                "Could not verify payment with Khalti. Please contact support."
            )}`
        );
    }
}
