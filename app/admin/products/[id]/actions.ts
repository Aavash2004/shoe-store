"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/authorization";
import { updateProductSchema, type UpdateProductInput } from "@/lib/validations/product";

export async function updateProduct(data: UpdateProductInput) {
  await requireAdmin();

  const validated = updateProductSchema.safeParse(data);
  if (!validated.success) {
    return { success: false as const, error: validated.error.flatten().fieldErrors };
  }

  const { id, images, variants, ...productData } = validated.data;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return { success: false as const, error: { id: ["Product not found"] } };
  }

  if (productData.slug && productData.slug !== existing.slug) {
    const slugTaken = await prisma.product.findUnique({ where: { slug: productData.slug } });
    if (slugTaken) {
      return { success: false as const, error: { slug: ["A product with this slug already exists"] } };
    }
  }

  await prisma.product.update({
    where: { id },
    data: {
      ...productData,
      ...(images && {
        images: {
          deleteMany: {},
          create: images.map((img) => ({
            url: img.url,
            altText: img.altText || null,
            isPrimary: img.isPrimary,
            position: img.position,
          })),
        },
      }),
      ...(variants && {
        variants: {
          deleteMany: {},
          create: variants.map((v) => ({
            size: v.size,
            color: v.color,
            sku: v.sku,
            price: v.price,
            stock: v.stock,
          })),
        },
      }),
    },
  });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  redirect(`/admin/products/${id}`);
}

export async function deleteProduct(id: string) {
  await requireAdmin();

  await prisma.product.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });

  revalidatePath("/admin/products");
  redirect("/admin/products");
}