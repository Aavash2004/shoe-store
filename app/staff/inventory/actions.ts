"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireStaff } from "@/lib/auth/authorization";

const StockAdjustmentSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
  delta: z
    .number()
    .int()
    .refine((val) => val !== 0, { message: "Stock adjustment delta cannot be zero" }),
  reason: z
    .string()
    .min(3, "A valid reason (minimum 3 characters) is required for audit logs")
    .max(250, "Reason cannot exceed 250 characters"),
});

export async function staffAdjustStock(payload: {
  variantId: string;
  delta: number;
  reason: string;
}) {
  let session;
  try {
    session = await requireStaff();
  } catch (authErr: any) {
    if (authErr?.message === "Password change required") {
      return {
        success: false as const,
        error: "Password change required",
        redirect: "/staff/change-password",
      };
    }
    return {
      success: false as const,
      error: "Forbidden: Access denied",
    };
  }
  const staffUser = session.staffDbUser;

  const parseResult = StockAdjustmentSchema.safeParse(payload);
  if (!parseResult.success) {
    return {
      success: false as const,
      error: parseResult.error.issues[0]?.message || "Invalid adjustment data",
    };
  }

  const { variantId, delta, reason } = parseResult.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.productVariant.findUnique({
        where: { id: variantId },
        include: { product: { select: { name: true } } },
      });

      if (!existing) {
        throw new Error("Product variant not found");
      }

      if (existing.stock + delta < 0) {
        throw new Error(
          `Cannot reduce stock by ${Math.abs(delta)}. Current stock is ${existing.stock}.`
        );
      }

      const updated = await tx.productVariant.update({
        where: { id: variantId },
        data: {
          stock: { increment: delta },
        },
      });

      await tx.adminActivityLog.create({
        data: {
          adminId: staffUser.id,
          action: "STAFF_ADJUSTED_STOCK",
          entity: "ProductVariant",
          entityId: variantId,
          metadata: {
            productName: existing.product.name,
            sku: existing.sku,
            size: existing.size,
            color: existing.color,
            delta,
            previousStock: existing.stock,
            newStock: updated.stock,
            reason: reason.trim(),
          },
        },
      });

      return updated;
    });

    try {
      revalidatePath("/staff/inventory");
      revalidatePath("/admin/inventory");
      revalidatePath("/admin");
    } catch {
      // Safe for tests
    }

    return {
      success: true as const,
      newStock: result.stock,
    };
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : "Failed to adjust stock.";
    return { success: false as const, error: errorMsg };
  }
}
