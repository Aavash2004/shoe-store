"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/authorization";
import { releaseOrderStock } from "@/lib/checkout/stock";

import {
  canTransition,
  isTerminalStatus,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/order-status";

const UpdateOrderStatusSchema = z.object({
  orderId: z.string().min(1, "Order ID is required."),
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "MANUAL_REVIEW",
  ]),
  note: z.string().max(500, "Note cannot exceed 500 characters.").optional(),
});

export async function updateOrderStatus(orderId: string, status: string, note?: string) {
    const session = await requireAdmin();

    const parseResult = UpdateOrderStatusSchema.safeParse({ orderId, status, note });
    if (!parseResult.success) {
        return { success: false as const, error: parseResult.error.issues[0]?.message || "Invalid status payload." };
    }

    const { orderId: validOrderId, status: validStatus, note: validNote } = parseResult.data;

    const order = await prisma.order.findUnique({
        where: { id: validOrderId },
        include: { items: true },
    });

    if (!order) {
        return { success: false as const, error: "Order not found." };
    }

    const currentStatus = order.status as OrderStatus;

    if (currentStatus === validStatus) {
        return { success: true as const };
    }

    if (isTerminalStatus(currentStatus)) {
        return {
            success: false as const,
            error: `Order is in terminal state "${ORDER_STATUS_LABELS[currentStatus] || currentStatus}" and cannot be transitioned.`,
        };
    }

    if (!canTransition(currentStatus, validStatus)) {
        return {
            success: false as const,
            error: `Illegal transition: Cannot change order from "${ORDER_STATUS_LABELS[currentStatus] || currentStatus}" to "${ORDER_STATUS_LABELS[validStatus] || validStatus}".`,
        };
    }

    let warningNotice: string | undefined;

    // Restock inventory and release coupon atomically via releaseOrderStock on transition to CANCELLED
    if (validStatus === "CANCELLED") {
        if (currentStatus === "MANUAL_REVIEW" && order.paymentStatus === "PAID") {
            warningNotice = `⚠️ Refund Required: Order #${order.orderNumber} was marked as PAID (${order.paymentMethod || "online"}). Inventory/coupon status has been handled, but a manual refund must be issued via your payment gateway dashboard.`;
        }

        const release = await releaseOrderStock(
            prisma,
            validOrderId,
            validNote || "Admin cancelled order"
        );
        if (!release.success) {
            return {
                success: false as const,
                error: release.reason || "Failed to cancel order.",
            };
        }
    } else if (currentStatus === "MANUAL_REVIEW" && (validStatus === "PROCESSING" || validStatus === "CONFIRMED")) {
        // Restrict MANUAL_REVIEW -> PROCESSING/CONFIRMED for case (b) (where stockReserved === false)
        // unless stock and coupon can be re-reserved atomically right now
        const isCaseB = order.stockReserved === false;

        if (isCaseB) {
            try {
                await prisma.$transaction(async (tx) => {
                    const { decrementStockWithLock } = await import("@/lib/checkout/stock");
                    await decrementStockWithLock(
                        tx,
                        order.items.map((i) => ({
                            variantId: i.variantId,
                            quantity: i.quantity,
                        }))
                    );

                    // Re-reserve coupon if attached
                    if (order.couponId) {
                        await tx.coupon.update({
                            where: { id: order.couponId },
                            data: { usedCount: { increment: 1 } },
                        });
                    }

                    const updateClaim = await tx.order.updateMany({
                        where: {
                            id: validOrderId,
                            status: currentStatus,
                        },
                        data: {
                            status: validStatus,
                            stockReserved: true,
                            manualReviewReason: null,
                        },
                    });

                    if (updateClaim.count === 0) {
                        throw new Error("ORDER_ALREADY_CLAIMED");
                    }
                });
            } catch (stockErr: any) {
                return {
                    success: false as const,
                    error: `Cannot confirm order #${order.orderNumber} from MANUAL_REVIEW: items are currently out of stock. Stock must be replenished before re-activating a late payment order. (${stockErr.message})`,
                };
            }
        } else {
            // Case (a): stock was already held on order placement
            const updateResult = await prisma.order.updateMany({
                where: {
                    id: validOrderId,
                    status: currentStatus,
                },
                data: {
                    status: validStatus,
                    manualReviewReason: null,
                },
            });

            if (updateResult.count === 0) {
                return {
                    success: false as const,
                    error: `Order status was concurrently modified by another user or is no longer in "${currentStatus}". Please refresh.`,
                };
            }
        }
    } else {
        // Race-safe atomic update for other non-cancellation transitions
        const updateData: any = {
            status: validStatus,
        };
        if (validStatus === "MANUAL_REVIEW") {
            updateData.manualReviewReason = validNote || "ADMIN_MANUAL_REVIEW";
        }

        const updateResult = await prisma.order.updateMany({
            where: {
                id: validOrderId,
                status: currentStatus,
            },
            data: updateData,
        });

        if (updateResult.count === 0) {
            return {
                success: false as const,
                error: `Order status was concurrently modified by another user or is no longer in "${currentStatus}". Please refresh.`,
            };
        }
    }

    const adminEmail = session.user?.email?.toLowerCase();
    const adminName = session.user?.name;
    const changedBy = adminEmail || adminName || "Admin";

    // Write audit status history record
    await prisma.orderStatusHistory.create({
        data: {
            orderId: validOrderId,
            status: validStatus,
            fromStatus: currentStatus,
            toStatus: validStatus,
            changedBy,
            note: validNote || null,
        },
    });

    // Safely resolve admin user for AdminActivityLog
    const sessionUserId = session.user?.id;
    const adminUser = await prisma.user.findFirst({
        where: {
            OR: [
                ...(sessionUserId ? [{ id: sessionUserId }] : []),
                ...(adminEmail ? [{ email: adminEmail }] : []),
            ],
        },
        select: { id: true },
    });

    if (adminUser) {
        await prisma.adminActivityLog.create({
            data: {
                adminId: adminUser.id,
                action: "CHANGED_ORDER_STATUS",
                entity: "Order",
                entityId: validOrderId,
                metadata: { fromStatus: currentStatus, newStatus: validStatus },
            },
        });
    }

    // Trigger transactional notification email for status transition
    try {
        const { sendShippingUpdateEmail } = await import("@/lib/services/email");
        await sendShippingUpdateEmail(validOrderId, validNote);
    } catch (emailErr) {
        console.warn("[Admin Order Status] Failed to dispatch email notification:", emailErr);
    }

    try {
        revalidatePath(`/admin/orders/${validOrderId}`);
        revalidatePath("/admin/orders");
        revalidatePath(`/account/orders/${validOrderId}`);
        revalidatePath("/account/orders");
    } catch {
        // Safe to ignore in test environment where Next.js static store is not initialized
    }

    return { success: true as const };
}

export async function refundOrder(orderId: string, reason?: string) {
    const session = await requireAdmin();

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
    });

    if (!order) {
        return { success: false as const, error: "Order not found." };
    }

    if (order.paymentStatus !== "PAID") {
        return { success: false as const, error: `Order payment status is '${order.paymentStatus}'. Only PAID orders can be refunded.` };
    }

    let refundIdentifier = "MANUAL";

    try {
        if (order.paymentMethod === "STRIPE") {
            if (!order.stripePaymentIntentId) {
                return { success: false as const, error: "Order does not have a Stripe Payment Intent ID." };
            }
            const { stripe } = await import("@/lib/services/stripe");
            const refund = await stripe.refunds.create({
                payment_intent: order.stripePaymentIntentId,
            });
            refundIdentifier = refund.id;
        } else if (order.paymentMethod === "KHALTI") {
            return {
                success: false as const,
                error: "Khalti ePayment does not support automated API refunds. Please process the refund manually via the Khalti Merchant Dashboard (https://admin.khalti.com). Once processed, add an order note with the Khalti refund reference.",
            };
        }

        // Restock inventory and release coupon atomically via releaseOrderStock if order wasn't already cancelled
        await releaseOrderStock(
            prisma,
            orderId,
            `Order refunded (${refundIdentifier})${reason ? `: ${reason}` : ""}`
        );

        await prisma.order.update({
            where: { id: orderId },
            data: {
                paymentStatus: "REFUNDED",
            },
        });

        // Record status history
        await prisma.orderStatusHistory.create({
            data: {
                orderId,
                status: "REFUNDED",
                note: `${order.paymentMethod || "Payment"} refunded (Ref: ${refundIdentifier}, Amount: ${order.currency} ${order.total}${reason ? `, Reason: ${reason}` : ""})`,
            },
        });

        // Admin activity log
        const sessionUserId = session.user?.id;
        const sessionEmail = session.user?.email?.toLowerCase();
        const adminUser = await prisma.user.findFirst({
            where: {
                OR: [
                    ...(sessionUserId ? [{ id: sessionUserId }] : []),
                    ...(sessionEmail ? [{ email: sessionEmail }] : []),
                ],
            },
            select: { id: true },
        });

        if (adminUser) {
            await prisma.adminActivityLog.create({
                data: {
                    adminId: adminUser.id,
                    action: "REFUNDED_ORDER",
                    entity: "Order",
                    entityId: orderId,
                    metadata: {
                        paymentMethod: order.paymentMethod,
                        refundId: refundIdentifier,
                        amount: Number(order.total),
                        currency: order.currency,
                        reason: reason || "Admin initiated refund",
                    },
                },
            });
        }

        try {
            revalidatePath(`/admin/orders/${orderId}`);
            revalidatePath("/admin/orders");
        } catch {
            // Safe to ignore in test runner
        }

        return { success: true as const, refundId: refundIdentifier };
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to process refund.";
        console.error("[Refund Error]:", err);
        return { success: false as const, error: errorMsg };
    }
}

export const refundStripeOrder = refundOrder;