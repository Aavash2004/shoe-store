"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/authorization";

const VALID_STATUSES = [
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
];

export async function updateOrderStatus(orderId: string, status: string, note?: string) {
    const session = await requireAdmin();

    if (!VALID_STATUSES.includes(status)) {
        return { success: false as const, error: "Invalid status" };
    }

    await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
            where: { id: orderId },
            include: { items: true },
        });

        if (!order) {
            throw new Error("Order not found");
        }

        // Handle stock updates if status is changing to or from CANCELLED
        if (order.status !== "CANCELLED" && status === "CANCELLED") {
            for (const item of order.items) {
                await tx.productVariant.update({
                    where: { id: item.variantId },
                    data: { stock: { increment: item.quantity } },
                });
            }
        } else if (order.status === "CANCELLED" && status !== "CANCELLED") {
            for (const item of order.items) {
                await tx.productVariant.update({
                    where: { id: item.variantId },
                    data: { stock: { decrement: item.quantity } },
                });
            }
        }

        await tx.order.update({
            where: { id: orderId },
            data: { status },
        });

        await tx.orderStatusHistory.create({
            data: { orderId, status, note: note || null },
        });

        await tx.adminActivityLog.create({
            data: {
                adminId: (session.user as any).id,
                action: "CHANGED_ORDER_STATUS",
                entity: "Order",
                entityId: orderId,
                metadata: { newStatus: status },
            },
        });
    });

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");

    return { success: true as const };
}