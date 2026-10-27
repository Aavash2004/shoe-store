import { Prisma } from "@/lib/generated/prisma/client";
import { releaseCouponUsage } from "@/lib/checkout/coupon";

export class InsufficientStockError extends Error {
  readonly variantId: string;
  readonly requested: number;
  readonly available?: number;
  readonly code = "OUT_OF_STOCK";

  constructor(
    message: string,
    variantId: string,
    requested: number,
    available?: number
  ) {
    super(message);
    this.name = "InsufficientStockError";
    this.variantId = variantId;
    this.requested = requested;
    this.available = available;
    Object.setPrototypeOf(this, InsufficientStockError.prototype);
  }
}

export interface StockItem {
  variantId: string;
  quantity: number;
}

/**
 * Atomically decrements inventory for requested items inside a database transaction.
 * Sorts variant IDs alphanumerically to guarantee AB-BA deadlock prevention.
 * Uses strict row-affected verification (count === 0 check).
 */
export async function decrementStockWithLock(
  tx: Prisma.TransactionClient,
  items: StockItem[]
): Promise<void> {
  // 1. Sort items by variantId ascending to prevent transaction deadlocks
  const sortedItems = [...items].sort((a, b) =>
    a.variantId.localeCompare(b.variantId)
  );

  // 2. Decrement each item atomically
  for (const item of sortedItems) {
    const result = await tx.productVariant.updateMany({
      where: {
        id: item.variantId,
        stock: { gte: item.quantity },
        isActive: true,
        product: {
          isActive: true,
          deletedAt: null,
          category: {
            isActive: true,
          },
        },
      },
      data: {
        stock: { decrement: item.quantity },
      },
    });

    if (result.count === 0) {
      // Find variant details to craft a precise error message
      const variant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
        select: {
          stock: true,
          product: { select: { name: true } },
        },
      });

      if (!variant) {
        throw new InsufficientStockError(
          "One or more selected items are no longer available.",
          item.variantId,
          item.quantity,
          0
        );
      }

      if (variant.stock <= 0) {
        throw new InsufficientStockError(
          `${variant.product.name} is currently out of stock.`,
          item.variantId,
          item.quantity,
          0
        );
      }

      throw new InsufficientStockError(
        `Only ${variant.stock} item${
          variant.stock > 1 ? "s" : ""
        } left in stock for ${variant.product.name}.`,
        item.variantId,
        item.quantity,
        variant.stock
      );
    }
  }
}

export interface ReleaseStockResult {
  success: boolean;
  restockedItemsCount: number;
  reason?: string;
}

export type CancelReasonType = "EXPIRED" | "CUSTOMER" | "ADMIN";

export interface ReleaseOrderStockOptions {
  requireNonPaid?: boolean;
  stockReserved?: boolean;
  cancelReason?: CancelReasonType;
}

/**
 * Idempotently cancels an order and restores stock.
 * Uses conditional status guard to prevent double-restocking on repeated calls.
 * Sorts variant IDs alphanumerically to prevent deadlocks.
 */
export async function releaseOrderStock(
  tx: Prisma.TransactionClient,
  orderId: string,
  reason: string = "Order cancelled",
  options?: ReleaseOrderStockOptions
): Promise<ReleaseStockResult> {
  // 1. Inspect whether stock and coupon are currently reserved for this order
  const orderRecord = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      couponCode: true,
      stockReserved: true,
      cancelReason: true,
    },
  });

  const shouldRelease =
    options?.stockReserved !== undefined
      ? options.stockReserved
      : (orderRecord?.stockReserved ?? false);

  // 2. Conditional status transition guard
  // Only orders in PENDING, PENDING_VERIFICATION, PROCESSING, or MANUAL_REVIEW may release stock to CANCELLED.
  // Atomically sets stockReserved = false in the SAME conditional update that cancels the order.
  const whereClause: Prisma.OrderWhereInput = {
    id: orderId,
    status: { in: ["PENDING", "PENDING_VERIFICATION", "PROCESSING", "MANUAL_REVIEW"] },
  };

  if (options?.requireNonPaid) {
    whereClause.paymentStatus = { not: "PAID" };
  }

  // Never overwrite an existing cancelReason
  const finalCancelReason = orderRecord?.cancelReason || options?.cancelReason;

  const updateResult = await tx.order.updateMany({
    where: whereClause,
    data: {
      status: "CANCELLED",
      stockReserved: false,
      ...(finalCancelReason ? { cancelReason: finalCancelReason } : {}),
    },
  });

  if (updateResult.count === 0) {
    return {
      success: false,
      restockedItemsCount: 0,
      reason: "Order is already cancelled, completed, or does not exist.",
    };
  }

  // 3. Release coupon usage if stock & coupon were reserved
  if (shouldRelease && orderRecord?.couponCode) {
    await releaseCouponUsage(tx, orderRecord.couponCode);
  }

  // 4. Record status history
  await tx.orderStatusHistory.create({
    data: {
      orderId,
      status: "CANCELLED",
      note: shouldRelease
        ? `Stock and promo code released: ${reason}`
        : `Order cancelled without stock/coupon release (none were reserved): ${reason}`,
    },
  });

  // If stock was not reserved (case b), finish without restocking variants
  if (!shouldRelease) {
    return {
      success: true,
      restockedItemsCount: 0,
      reason: "No stock or coupon was reserved for this order.",
    };
  }

  // 3. Fetch order items to restock
  const orderItems = await tx.orderItem.findMany({
    where: { orderId },
    select: { variantId: true, quantity: true },
  });

  // 4. Sort variant IDs ascending for deadlock prevention
  const sortedItems = [...orderItems].sort((a, b) =>
    a.variantId.localeCompare(b.variantId)
  );

  for (const item of sortedItems) {
    await tx.productVariant.update({
      where: { id: item.variantId },
      data: {
        stock: { increment: item.quantity },
      },
    });
  }

  return {
    success: true,
    restockedItemsCount: sortedItems.length,
  };
}
