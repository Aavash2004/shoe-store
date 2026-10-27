"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { releaseOrderStock } from "@/lib/checkout/stock";

export async function cancelCustomerOrder(orderId: string) {
  let session =
    process.env.NODE_ENV === "test" && (global as any).__mockCustomerSession
      ? (global as any).__mockCustomerSession
      : await auth();
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

  // Unpaid pending orders only
  if (order.status !== "PENDING" || order.paymentStatus !== "PENDING") {
    return {
      success: false,
      error: `Only unpaid pending orders can be cancelled. Current status: ${order.status} (${order.paymentStatus}).`,
    };
  }

  try {
    // 1. If a Stripe PaymentIntent exists, inspect and cancel it with Stripe first
    if (order.stripePaymentIntentId) {
      try {
        const { stripe } = await import("@/lib/services/stripe");
        const intent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);

        // If payment already succeeded, abort immediately and leave the order alone
        if (intent.status === "succeeded") {
          return {
            success: false,
            error: "Payment has already been processed for this order. Cancellation aborted.",
          };
        }

        await stripe.paymentIntents.cancel(order.stripePaymentIntentId, {
          cancellation_reason: "requested_by_customer",
        });
      } catch (stripeErr: any) {
        if (!stripeErr.message?.includes("already been canceled")) {
          console.warn(
            `[Customer Cancel] Failed to cancel Stripe intent ${order.stripePaymentIntentId}:`,
            stripeErr
          );
        }
      }
    }

    // 2. Release order stock and coupon usage with cancelReason CUSTOMER
    await prisma.$transaction(async (tx) => {
      const result = await releaseOrderStock(
        tx,
        order.id,
        "Order cancelled by customer via account dashboard.",
        { cancelReason: "CUSTOMER" }
      );
      if (!result.success) {
        throw new Error(result.reason || "Order cannot be cancelled.");
      }
    });

    try {
      revalidatePath(`/account/orders/${orderId}`);
      revalidatePath("/account/orders");
    } catch {}
    return { success: true };
  } catch (err: any) {
    console.error("[Customer Order Cancellation Error]:", err);
    return { success: false, error: "Failed to cancel order. Please try again." };
  }
}
