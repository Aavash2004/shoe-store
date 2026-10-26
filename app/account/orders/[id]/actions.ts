"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { releaseOrderStock } from "@/lib/checkout/stock";

export async function cancelCustomerOrder(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required." };
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: session.user.id,
    },
    include: {
      items: true,
    },
  });

  if (!order) {
    return { success: false, error: "Order not found." };
  }

  if (order.status !== "PENDING") {
    return {
      success: false,
      error: `Orders with status '${order.status}' cannot be self-cancelled. Please contact support.`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const result = await releaseOrderStock(
        tx,
        order.id,
        "Order cancelled by customer via account dashboard."
      );
      if (!result.success) {
        throw new Error(result.reason || "Order cannot be cancelled.");
      }
    });

    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath("/account/orders");
    return { success: true };
  } catch (err: any) {
    console.error("[Customer Order Cancellation Error]:", err);
    return { success: false, error: "Failed to cancel order. Please try again." };
  }
}
