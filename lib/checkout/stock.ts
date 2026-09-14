import { Prisma } from "@/lib/generated/prisma/client";

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

/**
 * Idempotently cancels an order and restores stock.
 * Uses conditional status guard to prevent double-restocking on repeated calls.
 * Sorts variant IDs alphanumerically to prevent deadlocks.
 */
export async function releaseOrderStock(
  tx: Prisma.TransactionClient,
  orderId: string,
  reason: string = "Order cancelled"
): Promise<ReleaseStockResult> {
  // 1. Conditional status transition guard
  // Only orders in PENDING, PENDING_VERIFICATION, or PROCESSING may release stock to CANCELLED
  const updateResult = await tx.order.updateMany({
    where: {
      id: orderId,
      status: { in: ["PENDING", "PENDING_VERIFICATION", "PROCESSING"] },
    },
    data: {
      status: "CANCELLED",
    },
  });

  if (updateResult.count === 0) {
    return {
      success: false,
      restockedItemsCount: 0,
      reason: "Order is already cancelled, completed, or does not exist.",
    };
  }

  // 2. Record status history
  await tx.orderStatusHistory.create({
    data: {
      orderId,
      status: "CANCELLED",
      note: `Stock released back to inventory: ${reason}`,
    },
  });

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
