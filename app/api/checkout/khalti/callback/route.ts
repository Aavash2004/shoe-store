import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { lookupKhaltiPayment } from "@/lib/services/khalti";
import { releaseOrderStock } from "@/lib/checkout/stock";
import { releaseCouponUsage } from "@/lib/checkout/coupon";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const pidx = searchParams.get("pidx");
    const purchaseOrderId = searchParams.get("purchase_order_id");

    const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        `${request.nextUrl.protocol}//${request.nextUrl.host}`;

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
                    `[Khalti Amount Mismatch] Order ${order.id}: expected ${expectedPaisa} paisa, received ${lookupResult.total_amount} paisa.`
                );
                return NextResponse.redirect(
                    `${baseUrl}/checkout?error=${encodeURIComponent("Payment amount mismatch. Please contact support.")}`
                );
            }

            // 3. Mark Order as PAID and PROCESSING (atomic conditional update for idempotency)
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
            // Payment canceled or expired: Release stock and coupon atomically & idempotently
            await prisma.$transaction(async (tx) => {
                const res = await tx.order.updateMany({
                    where: { id: order.id, status: { not: "CANCELLED" } },
                    data: {
                        paymentStatus: "FAILED",
                        status: "CANCELLED",
                    },
                });

                if (res.count > 0) {
                    await releaseOrderStock(tx, order.id);
                    await releaseCouponUsage(tx, order.couponCode);
                    await tx.orderStatusHistory.create({
                        data: {
                            orderId: order.id,
                            status: "CANCELLED",
                            note: `Khalti payment status: ${lookupResult.status}`,
                        },
                    });
                }
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
