"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/authorization";
import {
  updateProductSchema,
  type UpdateProductInput,
} from "@/lib/validations/product";

export async function updateProduct(data: UpdateProductInput) {
  await requireAdmin();

  const validated = updateProductSchema.safeParse(data);

  if (!validated.success) {
    return {
      success: false as const,
      error: validated.error.flatten().fieldErrors,
    };
  }

  const { id, images, variants, ...productData } = validated.data;

  const existing = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: true,
      images: true,
    },
  });

  if (!existing) {
    return {
      success: false as const,
      error: {
        id: ["Product not found"],
      },
    };
  }

  // --------------------------------------------------
  // SLUG CHECK
  // --------------------------------------------------

  if (productData.slug && productData.slug !== existing.slug) {
    const slugTaken = await prisma.product.findUnique({
      where: {
        slug: productData.slug,
      },
    });

    if (slugTaken) {
      return {
        success: false as const,
        error: {
          slug: ["A product with this slug already exists"],
        },
      };
    }
  }

  // --------------------------------------------------
  // UPDATE PRODUCT
  // --------------------------------------------------

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },

      data: {
        ...productData,

        // --------------------------------------------
        // IMAGES
        // --------------------------------------------

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
      },
    });

    // ------------------------------------------------
    // VARIANTS
    // ------------------------------------------------

    if (variants) {
      const submittedVariantIds = variants
        .map((variant) => variant.id)
        .filter((id): id is string => Boolean(id));

      // ----------------------------------------------
      // 1. Soft-delete variants removed from the form
      // ----------------------------------------------

      const removedVariants = existing.variants.filter(
        (existingVariant) =>
          !submittedVariantIds.includes(existingVariant.id)
      );

      for (const variant of removedVariants) {
        await tx.productVariant.update({
          where: {
            id: variant.id,
          },

          data: {
            isActive: false,
            deletedAt: new Date(),
          },
        });
      }

      // ----------------------------------------------
      // 2. Update existing variants / create new ones
      // ----------------------------------------------

      for (const variant of variants) {
        if (variant.id) {
          // Existing variant
          await tx.productVariant.update({
            where: {
              id: variant.id,
            },

            data: {
              size: variant.size,
              color: variant.color,
              sku: variant.sku,
              price: variant.price,
              stock: variant.stock,
              isActive: true,
              deletedAt: null,
            },
          });
        } else {
          // New variant
          await tx.productVariant.create({
            data: {
              productId: id,
              size: variant.size,
              color: variant.color,
              sku: variant.sku,
              price: variant.price,
              stock: variant.stock,
              isActive: true,
            },
          });
        }
      }
    }
  });

  // --------------------------------------------------
  // CACHE
  // --------------------------------------------------

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);

  redirect(`/admin/products/${id}`);
}

// ====================================================
// DELETE PRODUCT
// ====================================================

export async function deleteProduct(id: string) {
  await requireAdmin();

  const existing = await prisma.product.findUnique({
    where: { id },
  });

  if (!existing) {
    return {
      success: false as const,
      error: "Product not found",
    };
  }

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