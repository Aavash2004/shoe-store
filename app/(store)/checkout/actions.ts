"use server";

import { prisma } from "@/lib/db/prisma";

/**
 * Server action to retrieve order number by order ID safely.
 * Enables the client checkout error notice to display the order reference
 * without passing order numbers or emails through URL search params.
 */
export async function getOrderNumber(orderId: string): Promise<string | null> {
  if (!orderId || typeof orderId !== "string") return null;
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true },
    });
    return order?.orderNumber || null;
  } catch (error) {
    console.error("[getOrderNumber] Failed to fetch orderNumber:", error);
    return null;
  }
}
