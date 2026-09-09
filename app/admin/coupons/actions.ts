"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/authorization";

function generateCuid(): string {
  return "c" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

const CreateCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Coupon code must be at least 3 characters.")
      .max(30, "Coupon code cannot exceed 30 characters.")
      .regex(/^[A-Za-z0-9_-]+$/, "Coupon code can only contain letters, numbers, dashes, and underscores."),
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    discountValue: z.number().positive("Discount value must be greater than 0."),
    minSubtotal: z.number().nonnegative("Minimum subtotal cannot be negative.").optional().default(0),
    maxUses: z.number().int("Max uses must be a whole number.").positive().nullable().optional(),
    expiresAt: z.string().nullable().optional(),
  })
  .refine(
    (data) => data.discountType !== "PERCENTAGE" || data.discountValue <= 100,
    { message: "Percentage discount cannot exceed 100%.", path: ["discountValue"] }
  );

export async function createCoupon(rawInput: {
  code: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minSubtotal?: number;
  maxUses?: number | null;
  expiresAt?: string | null;
}) {
  await requireAdmin();

  const parseResult = CreateCouponSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid coupon data." };
  }

  const { code, discountType, discountValue, minSubtotal, maxUses, expiresAt } = parseResult.data;
  const formattedCode = code.toUpperCase();

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

  const idCheck = z.string().min(1, "Valid coupon ID is required.").safeParse(id);
  if (!idCheck.success) {
    return { success: false, error: "Invalid coupon ID." };
  }

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "coupons" SET "isActive" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
      !currentActive,
      idCheck.data
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

  const idCheck = z.string().min(1, "Valid coupon ID is required.").safeParse(id);
  if (!idCheck.success) {
    return { success: false, error: "Invalid coupon ID." };
  }

  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "coupons" WHERE "id" = $1`,
      idCheck.data
    );

    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error) {
    console.error("[Delete Coupon Error]:", error);
    return { success: false, error: "Failed to delete coupon." };
  }
}
