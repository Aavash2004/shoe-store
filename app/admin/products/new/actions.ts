"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/authorization";
import { createProductSchema, type CreateProductInput } from "@/lib/validations/product";

export async function createProduct(data: CreateProductInput) {
  await requireAdmin();

  const validated = createProductSchema.safeParse(data);
  if (!validated.success) {
    return { success: false as const, error: validated.error.flatten().fieldErrors };
  }

  const { images, variants, ...productData } = validated.data;

  const existing = await prisma.product.findUnique({ where: { slug: productData.slug } });
  if (existing) {
    return { success: false as const, error: { slug: ["A product with this slug already exists"] } };
  }

  const product = await prisma.product.create({
    data: {
      ...productData,
      images: {
        create: images.map((img) => ({
          url: img.url,
          altText: img.altText || null,
          isPrimary: img.isPrimary,
          position: img.position,
        })),
      },
      variants: {
        create: variants.map((v) => ({
          size: v.size,
          color: v.color,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
        })),
      },
    },
  });

  revalidatePath("/admin/products");
  redirect(`/admin/products/${product.id}`);
}
