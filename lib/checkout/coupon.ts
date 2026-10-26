import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

export class CouponExhaustedError extends Error {
  readonly code = "COUPON_EXHAUSTED";
  constructor(message = "This coupon has reached its maximum usage limit or is no longer valid.") {
    super(message);
    this.name = "CouponExhaustedError";
    Object.setPrototypeOf(this, CouponExhaustedError.prototype);
  }
}

/**
 * Atomically increments the coupon's usedCount with a guard against exceeding maxUses.
 * Returns true if the coupon was successfully incremented, false if the coupon
 * is inactive, expired, or has reached its maxUses limit.
 */
export async function reserveCouponUsage(
  tx: Prisma.TransactionClient,
  couponCode: string
): Promise<boolean> {
  const cleanCode = couponCode.trim();
  if (!cleanCode) return true;

  const affectedRows = await tx.$executeRaw`
    UPDATE "coupons"
    SET "usedCount" = "usedCount" + 1
    WHERE UPPER("code") = UPPER(${cleanCode})
      AND "isActive" = true
      AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
      AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
  `;

  return affectedRows > 0;
}

/**
 * Safely releases (decrements) coupon usage when an unfulfilled order is canceled or expires.
 * Uses GREATEST(0, usedCount - 1) to prevent negative counts.
 */
export async function releaseCouponUsage(
  db: Prisma.TransactionClient | typeof prisma,
  couponCode?: string | null
): Promise<void> {
  if (!couponCode || !couponCode.trim()) return;

  await db.$executeRaw`
    UPDATE "coupons"
    SET "usedCount" = GREATEST(0, "usedCount" - 1)
    WHERE UPPER("code") = UPPER(${couponCode.trim()})
  `;
}
