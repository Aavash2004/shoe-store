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

    await prisma.adminActivityLog.create({
        data: {
            adminId: (session.user as any).id,
            action: "CHANGED_ORDER_STATUS",
            entity: "Order",
            entityId: validOrderId,
            metadata: { newStatus: validStatus },
        },
    });

    revalidatePath(`/admin/orders/${validOrderId}`);
    revalidatePath("/admin/orders");

    return { success: true as const };
}