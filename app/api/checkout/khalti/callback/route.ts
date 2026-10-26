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
            `${baseUrl}/checkout?error=MISSING_PAYMENT_TOKEN`
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
            `${baseUrl}/checkout?error=ORDER_NOT_FOUND`
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
                    `${baseUrl}/checkout?error=PAYMENT_AMOUNT_MISMATCH&orderId=${order.id}`
                );
            }

            // Check if the order was previously CANCELLED (e.g. 30-min TTL expired)
            if (order.status === "CANCELLED") {
                // Late payment on a CANCELLED order: Try to reinstate if stock allows; otherwise hold in MANUAL_REVIEW
                try {
                    await prisma.$transaction(async (tx) => {
                        // Atomically claim the cancelled order first; continue only if count > 0
                        const claimResult = await tx.order.updateMany({
                            where: { id: order.id, status: "CANCELLED" },
                            data: {
                                status: "PROCESSING",
                                paymentStatus: "PAID",
                                transactionId: lookupResult.transaction_id || pidx,
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

                        // Re-reserve coupon if attached (force-increment even if maxUses reached)
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
                    if (stockErr.message === "ORDER_ALREADY_CLAIMED") {
                        console.log(`[Khalti Callback] Order ${order.id} was already claimed by concurrent process.`);
                        return NextResponse.redirect(`${baseUrl}/order-confirmation/${order.id}`);
                    }

                    console.error(
                        `🚨 [Khalti Callback - Late Payment OUT OF STOCK] Order ${order.id} was CANCELLED and payment succeeded (${pidx}), but items are out of stock. Placing in MANUAL_REVIEW with admin alert:`,
                        stockErr.message
                    );

                    await prisma.order.update({
                        where: { id: order.id },
                        data: {
                            status: "MANUAL_REVIEW",
                            paymentStatus: "PAID",
                            transactionId: lookupResult.transaction_id || pidx,
                        },
                    });

                    await prisma.orderStatusHistory.create({
                        data: {
                            orderId: order.id,
                            status: "MANUAL_REVIEW",
                            note: `Late payment received via Khalti (${lookupResult.transaction_id || pidx}) for CANCELLED order, but stock was no longer available. Held in MANUAL_REVIEW for merchant review and manual refund.`,
                        },
                    });

                    try {
                        const { sendShippingUpdateEmail } = await import("@/lib/services/email");
                        await sendShippingUpdateEmail(
                            order.id,
                            `🚨 CRITICAL ALERT: Order #${order.orderNumber} late Khalti payment (${pidx}) arrived after cancellation, but items are OUT OF STOCK. Order placed in MANUAL_REVIEW for manual refund.`
                        );
                    } catch (emailErr) {
                        console.error("[Khalti Callback] Failed to dispatch admin alert email on out-of-stock late payment:", emailErr);
                    }

                    Sentry.captureMessage(
                        `Khalti late payment for out-of-stock cancelled order #${order.orderNumber} placed in MANUAL_REVIEW`,
                        {
                            level: "warning",
                            extra: { orderId: order.id, pidx, total: order.total },
                        }
                    );

                    return NextResponse.redirect(
                        `${baseUrl}/checkout?error=ORDER_EXPIRED_OUT_OF_STOCK&orderId=${order.id}`
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
                `${baseUrl}/checkout?error=PAYMENT_FAILED&orderId=${order.id}`
            );
        }
    } catch (err: any) {
        console.error("[Khalti Callback Verification Error]:", err);
        return NextResponse.redirect(
            `${baseUrl}/checkout?error=PAYMENT_FAILED`
        );
    }
}
