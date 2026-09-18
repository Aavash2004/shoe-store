import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { lookupKhaltiPayment } from "@/lib/services/khalti";
import { releaseOrderStock } from "@/lib/checkout/stock";

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

    // If already paid (idempotent return)
    if (order.paymentStatus === "PAID") {
        return NextResponse.redirect(
            `${baseUrl}/checkout/success?orderId=${order.id}&orderNumber=${order.orderNumber}&method=KHALTI`
        );
    }

    try {
        // 2. Server-to-server verification via Khalti Lookup API
        const lookupResult = await lookupKhaltiPayment(pidx);

        if (lookupResult.status === "Completed") {
            // 3. Mark Order as PAID and PROCESSING
            await prisma.$transaction(async (tx) => {
                await tx.order.update({
                    where: { id: order.id },
                    data: {
                        paymentStatus: "PAID",
                        status: "PROCESSING",
                        transactionId: lookupResult.transaction_id || pidx,
                    },
                });

                await tx.orderStatusHistory.create({
                    data: {
                        orderId: order.id,
                        status: "PAID",
                        note: `Payment verified via Khalti (Txn ID: ${lookupResult.transaction_id}, Amount: NPR ${(
                            lookupResult.total_amount / 100
                        ).toFixed(2)})`,
                    },
                });
            });

            return NextResponse.redirect(
                `${baseUrl}/checkout/success?orderId=${order.id}&orderNumber=${order.orderNumber}&method=KHALTI`
            );
        } else {
            // Payment canceled or expired: Release stock
            await prisma.$transaction(async (tx) => {
                await releaseOrderStock(tx, order.id);
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
                        status: "CANCELLED",
                        note: `Khalti payment status: ${lookupResult.status}`,
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
