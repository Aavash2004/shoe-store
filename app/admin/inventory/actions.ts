"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/authorization";

const updateStockSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
  newStock: z.number().int().min(0, "Stock cannot be negative"),
});

export async function updateVariantStock(variantId: string, newStock: number) {
  const session = await requireAdmin();

  const parseResult = updateStockSchema.safeParse({ variantId, newStock });
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Invalid stock data",
    };
  }

  const { variantId: id, newStock: stock } = parseResult.data;

  try {
    const existing = await prisma.productVariant.findUnique({
      where: { id },
      include: { product: { select: { name: true } } },
    });

    if (!existing) {
      return { success: false, error: "Variant not found" };
    }

    const previousStock = existing.stock;

    await prisma.productVariant.update({
      where: { id },
      data: { stock },
    });

    // Admin audit log
    const sessionUserId = (session.user as { id?: string })?.id;
    const sessionEmail = session.user?.email?.toLowerCase();
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(sessionUserId ? [{ id: sessionUserId }] : []),
          ...(sessionEmail ? [{ email: sessionEmail }] : []),
        ],
      },
      select: { id: true },
    });

    if (adminUser) {
      await prisma.adminActivityLog.create({
        data: {
          adminId: adminUser.id,
          action: "UPDATED_INVENTORY_STOCK",
          entity: "ProductVariant",
          entityId: id,
          metadata: {
            productName: existing.product.name,
            size: existing.size,
            color: existing.color,
            previousStock,
            newStock: stock,
          },
        },
      });
    }

    revalidatePath("/admin/inventory");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update stock.";
    console.error("[Update Variant Stock Error]:", err);
    return { success: false, error: errorMsg };
  }
}

const restockSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
  amount: z.number().int().min(1, "Restock quantity must be at least 1"),
});

export async function restockVariantQuantity(variantId: string, amount: number) {
  const session = await requireAdmin();

  const parseResult = restockSchema.safeParse({ variantId, amount });
  if (!parseResult.success) {
    return {
      success: false as const,
      error: parseResult.error.issues[0]?.message || "Invalid restock quantity",
    };
  }

  const { variantId: id, amount: qty } = parseResult.data;

  try {
    const updated = await prisma.productVariant.update({
      where: { id },
      data: {
        stock: { increment: qty },
      },
      include: {
        product: { select: { name: true } },
      },
    });

    const adminEmail = session.user?.email?.toLowerCase();
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(session.user?.id ? [{ id: session.user.id }] : []),
          ...(adminEmail ? [{ email: adminEmail }] : []),
        ],
      },
      select: { id: true },
    });

    if (adminUser) {
      await prisma.adminActivityLog.create({
        data: {
          adminId: adminUser.id,
          action: "RESTOCKED_VARIANT",
          entity: "ProductVariant",
          entityId: id,
          metadata: {
            productName: updated.product.name,
            size: updated.size,
            color: updated.color,
            addedQuantity: qty,
            newStock: updated.stock,
          },
        },
      });
    }

    revalidatePath("/admin");
    revalidatePath("/admin/inventory");

    return { success: true as const, newStock: updated.stock };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to restock in database.";
    console.error("[Restock Error]:", err);
    return { success: false as const, error: errorMsg };
  }
}

