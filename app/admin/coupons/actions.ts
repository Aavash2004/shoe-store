"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/authorization";

function generateCuid(): string {
  return "c" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export async function createCoupon({
  code,
  discountType,
  discountValue,
  minSubtotal,
  maxUses,
  expiresAt,
}: {
  code: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minSubtotal?: number;
  maxUses?: number | null;
  expiresAt?: string | null;
}) {
  await requireAdmin();

  const formattedCode = code.trim().toUpperCase();
  if (!formattedCode) {
    return { success: false, error: "Coupon code is required." };
  }

  if (discountValue <= 0) {
    return { success: false, error: "Discount value must be greater than 0." };
  }

  try {
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id" FROM "coupons" WHERE UPPER("code") = $1 LIMIT 1`,
      formattedCode
    );

    if (existing && existing.length > 0) {
      return { success: false, error: `Coupon code "${formattedCode}" already exists.` };
    }

    const id = generateCuid();
    const expDate = expiresAt ? new Date(expiresAt) : null;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "coupons" ("id", "code", "discountType", "discountValue", "minSubtotal", "maxUses", "usedCount", "isActive", "expiresAt", "createdAt", "updatedAt") 
       VALUES ($1, $2, $3::"DiscountType", $4, $5, $6, 0, true, $7, NOW(), NOW())`,
      id,
      formattedCode,
      discountType,
      discountValue,
      minSubtotal ?? 0,
      maxUses ?? null,
      expDate
    );

    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error) {
    console.error("[Create Coupon Error]:", error);
    return { success: false, error: "Failed to create coupon." };
  }
}

export async function toggleCouponStatus(id: string, currentActive: boolean) {
  await requireAdmin();

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "coupons" SET "isActive" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
      !currentActive,
      id
    );

    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error) {
    console.error("[Toggle Coupon Error]:", error);
    return { success: false, error: "Failed to update coupon status." };
  }
}

export async function deleteCoupon(id: string) {
  await requireAdmin();

  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "coupons" WHERE "id" = $1`,
      id
    );

    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error) {
    console.error("[Delete Coupon Error]:", error);
    return { success: false, error: "Failed to delete coupon." };
  }
}
