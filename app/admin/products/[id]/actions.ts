"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
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

  await prisma.product.update({
    where: { id },
    data: productData,
  });

  // --------------------------------------------------
  // IMAGES
  // --------------------------------------------------

  if (images) {
    await prisma.productImage.deleteMany({
      where: { productId: id },
    });

    if (images.length > 0) {
      await prisma.productImage.createMany({
        data: images.map((img) => ({
          productId: id,
          url: img.url,
          altText: img.altText || null,
          isPrimary: img.isPrimary,
          position: img.position,
        })),
      });
    }
  }

  // --------------------------------------------------
  // VARIANTS
  // --------------------------------------------------

  if (variants) {
    // 0. Check for duplicate SKUs within the submitted variants list
    const trimmedSkus = variants.map((v) => v.sku.trim());
    const seenSkus = new Set<string>();
    const duplicateSkisInForm: string[] = [];
    for (const s of trimmedSkus) {
      const lower = s.toLowerCase();
      if (seenSkus.has(lower)) {
        duplicateSkisInForm.push(s);
      } else {
        seenSkus.add(lower);
      }
    }

    if (duplicateSkisInForm.length > 0) {
      return {
        success: false as const,
        error: {
          variants: [
            `Duplicate SKU "${duplicateSkisInForm[0]}" detected in variants. Each variant must have a unique SKU.`,
          ],
        },
      };
    }

    const submittedVariantIds = variants
      .map((variant) => variant.id)
      .filter((id): id is string => Boolean(id));

    try {
      // 1. Soft-delete variants removed from form
      const removedVariants = existing.variants.filter(
        (existingVariant) =>
          !submittedVariantIds.includes(existingVariant.id)
      );

      for (const variant of removedVariants) {
        await prisma.productVariant.update({
          where: {
            id: variant.id,
          },
          data: {
            isActive: false,
            deletedAt: new Date(),
          },
        });
      }

      // 2. Update existing variants / create new ones
      for (const variant of variants) {
        if (variant.id) {
          await prisma.productVariant.update({
            where: {
              id: variant.id,
            },
            data: {
              size: variant.size.trim(),
              color: variant.color.trim(),
              sku: variant.sku.trim(),
              price: variant.price,
              stock: variant.stock,
              isActive: true,
              deletedAt: null,
            },
          });
        } else {
          const existingSku = await prisma.productVariant.findFirst({
            where: {
              sku: { equals: variant.sku.trim(), mode: "insensitive" },
            },
          });

          if (existingSku) {
            if (existingSku.productId === id) {
              await prisma.productVariant.update({
                where: { id: existingSku.id },
                data: {
                  size: variant.size.trim(),
                  color: variant.color.trim(),
                  price: variant.price,
                  stock: variant.stock,
                  isActive: true,
                  deletedAt: null,
                },
              });
            } else {
              return {
                success: false as const,
                error: {
                  variants: [`SKU "${variant.sku}" is already in use by another product.`],
                },
              };
            }
          } else {
            await prisma.productVariant.create({
              data: {
                productId: id,
                size: variant.size.trim(),
                color: variant.color.trim(),
                sku: variant.sku.trim(),
                price: variant.price,
                stock: variant.stock,
                isActive: true,
              },
            });
          }
        }
      }
    } catch (err: any) {
      console.error("[updateProduct variants error]:", err);
      if (err?.code === "P2002") {
        return {
          success: false as const,
          error: {
            variants: ["One or more variant SKUs already exist in the database. Please provide unique SKUs."],
          },
        };
      }
      return {
        success: false as const,
        error: {
          variants: [err?.message || "Failed to update variants due to database constraint."],
        },
      };
    }
  }


  // --------------------------------------------------
  // CACHE REVALIDATION
  // --------------------------------------------------

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/products/[slug]", "page");
  if (existing.slug) {
    revalidatePath(`/products/${existing.slug}`);
  }
  if (productData.slug && productData.slug !== existing.slug) {
    revalidatePath(`/products/${productData.slug}`);
  }

  return { success: true as const };
}

// ====================================================
// DELETE PRODUCT
// ====================================================

export async function deleteProduct(id: string) {
  await requireAdmin();

  const idCheck = z.string().min(1, "Product ID is required.").safeParse(id);
  if (!idCheck.success) {
    return {
      success: false as const,
      error: "Invalid product ID",
    };
  }

  const existing = await prisma.product.findUnique({
    where: { id: idCheck.data },
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
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/products/[slug]", "page");
  if (existing.slug) {
    revalidatePath(`/products/${existing.slug}`);
  }
  redirect("/admin/products");
}