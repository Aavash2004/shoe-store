"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/authorization";
import { createProductSchema, type CreateProductInput } from "@/lib/validations/product";

export async function createProduct(data: CreateProductInput) {
  await requireAdmin();

  // Sanitize any React Flight serialized "$undefined" string markers
  const cleanedData = {
    ...data,
    brand: data.brand === "$undefined" ? undefined : data.brand,
    metaTitle: data.metaTitle === "$undefined" ? undefined : data.metaTitle,
    metaDescription: data.metaDescription === "$undefined" ? undefined : data.metaDescription,
    images: data.images?.map((img) => ({
      ...img,
      altText: img.altText === "$undefined" ? undefined : img.altText,
    })),
    variants: data.variants?.map((v) => {
      const { id, ...rest } = v;
      return id && id !== "$undefined" ? { ...rest, id } : rest;
    }),
  };

  const validated = createProductSchema.safeParse(cleanedData);
  if (!validated.success) {
    return { success: false as const, error: validated.error.flatten().fieldErrors };
  }

  const { images, variants, ...productData } = validated.data;

  const existing = await prisma.product.findUnique({ where: { slug: productData.slug } });
  if (existing) {
    return { success: false as const, error: { slug: ["A product with this slug already exists"] } };
  }

  const skus = variants.map((v) => v.sku.trim());
  const existingSkus = await prisma.productVariant.findMany({
    where: { sku: { in: skus } },
    select: { sku: true },
  });

  if (existingSkus.length > 0) {
    return {
      success: false as const,
      error: { variants: [`SKU "${existingSkus[0].sku}" is already in use by another product`] },
    };
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
  revalidatePath("/");
  revalidatePath("/shop");
  if (product.slug) {
    revalidatePath(`/products/${product.slug}`);
  }
  return { success: true as const, productId: product.id };
}
