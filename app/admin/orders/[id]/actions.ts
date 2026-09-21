"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/authorization";

const UpdateOrderStatusSchema = z.object({
  orderId: z.string().min(1, "Order ID is required."),
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
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
        return { success: false as const, error: "Order not found" };
    }

    // Handle stock updates if status is changing to or from CANCELLED
    if (order.status !== "CANCELLED" && validStatus === "CANCELLED") {
        for (const item of order.items) {
            await prisma.productVariant.update({
                where: { id: item.variantId },
                data: { stock: { increment: item.quantity } },
            });
        }
    } else if (order.status === "CANCELLED" && validStatus !== "CANCELLED") {
        for (const item of order.items) {
            await prisma.productVariant.update({
                where: { id: item.variantId },
                data: { stock: { decrement: item.quantity } },
            });
        }
    }

    await prisma.order.update({
        where: { id: validOrderId },
        data: { status: validStatus },
    });

    await prisma.orderStatusHistory.create({
        data: { orderId: validOrderId, status: validStatus, note: validNote || null },
    });

    // Safely resolve admin user to guarantee foreign key integrity
    const sessionUserId = (session.user as any)?.id;
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
                action: "CHANGED_ORDER_STATUS",
                entity: "Order",
                entityId: validOrderId,
                metadata: { newStatus: validStatus },
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

    revalidatePath(`/admin/orders/${validOrderId}`);
    revalidatePath("/admin/orders");

    return { success: true as const };
}

export async function refundStripeOrder(orderId: string, reason?: string) {
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

    if (!order.stripePaymentIntentId) {
        return { success: false as const, error: "Order does not have a Stripe Payment Intent ID." };
    }

    try {
        const { stripe } = await import("@/lib/services/stripe");

        // 1. Trigger Stripe refund API
        const refund = await stripe.refunds.create({
            payment_intent: order.stripePaymentIntentId,
        });

        // 2. Restock inventory if order wasn't already cancelled
        if (order.status !== "CANCELLED") {
            for (const item of order.items) {
                await prisma.productVariant.update({
                    where: { id: item.variantId },
                    data: { stock: { increment: item.quantity } },
                });
            }
        }

        // 3. Update order payment & fulfillment status
        await prisma.order.update({
            where: { id: orderId },
            data: {
                paymentStatus: "REFUNDED",
                status: "CANCELLED",
            },
        });

        // 4. Record status history
        await prisma.orderStatusHistory.create({
            data: {
                orderId,
                status: "REFUNDED",
                note: `Stripe payment refunded (Refund ID: ${refund.id}, Amount: ${order.currency} ${order.total}${reason ? `, Reason: ${reason}` : ""})`,
            },
        });

        // 5. Admin activity log
        const sessionUserId = (session.user as any)?.id;
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
                        refundId: refund.id,
                        amount: Number(order.total),
                        currency: order.currency,
                        reason: reason || "Admin initiated refund",
                    },
                },
            });
        }

        revalidatePath(`/admin/orders/${orderId}`);
        revalidatePath("/admin/orders");

        return { success: true as const, refundId: refund.id };
    } catch (err: any) {
        console.error("[Stripe Refund Error]:", err);
        return { success: false as const, error: err.message || "Failed to process Stripe refund." };
    }
}