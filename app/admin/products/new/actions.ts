"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/authorization";
import { createProductSchema, type CreateProductInput } from "@/lib/validations/product";
import { resolveAutoSkuCollisionAsync } from "@/lib/utils/variant-generator";

export async function createProduct(data: CreateProductInput) {
  await requireAdmin();

  // Sanitize any React Flight serialized "$undefined" string markers and normalize SKU
  const cleanedData = {
    ...data,
    slug: data.slug?.trim().toLowerCase(),
    brand: data.brand === "$undefined" ? undefined : data.brand,
    metaTitle: data.metaTitle === "$undefined" ? undefined : data.metaTitle,
    metaDescription: data.metaDescription === "$undefined" ? undefined : data.metaDescription,
    images: data.images?.map((img) => ({
      ...img,
      altText: img.altText === "$undefined" ? undefined : img.altText,
    })),
    variants: data.variants?.map((v) => {
      const { id, ...rest } = v;
      return {
        ...rest,
        sku: typeof v.sku === "string" ? v.sku.trim().toUpperCase() : v.sku,
        isManualSku: Boolean(v.isManualSku),
        ...(id && id !== "$undefined" ? { id } : {}),
      };
    }),
  };

  const validated = createProductSchema.safeParse(cleanedData);
  if (!validated.success) {
    return { success: false as const, error: validated.error.flatten().fieldErrors };
  }

  const { images, variants, ...productData } = validated.data;

  // 1. Slug uniqueness check
  const existingSlug = await prisma.product.findUnique({ where: { slug: productData.slug } });
  if (existingSlug) {
    return { success: false as const, error: { slug: ["A product with this slug already exists."] } };
  }

  // 2. Validation: No duplicate color + size pair
  const pairSet = new Set<string>();
  for (const v of variants) {
    const key = `${v.color.trim().toLowerCase()}:::${v.size.trim().toLowerCase()}`;
    if (pairSet.has(key)) {
      return {
        success: false as const,
        error: {
          variants: [
            `Duplicate variant detected for color "${v.color}" and size "${v.size}". Each variant must have a unique color and size combination.`,
          ],
        },
      };
    }
    pairSet.add(key);
  }

  // 3. Resolve SKU collisions against Database
  const incomingSkus = variants.map((v) => v.sku.trim().toUpperCase());
  const existingDbVariants = await prisma.productVariant.findMany({
    where: {
      sku: { in: incomingSkus },
    },
    select: { sku: true },
  });
  const takenSkusSet = new Set(existingDbVariants.map((v) => v.sku.toUpperCase()));

  // Reject immediately if the admin manually typed a colliding SKU
  for (const v of variants) {
    const upperSku = v.sku.trim().toUpperCase();
    if (takenSkusSet.has(upperSku) && v.isManualSku) {
      return {
        success: false as const,
        error: {
          variants: [`SKU "${upperSku}" is already in use by another product. Please choose a unique SKU.`],
        },
      };
    }
  }

  // Suffix auto-generated colliding SKUs (-2, -3, etc.)
  const resolvedVariants = [];
  const assignedSkus = new Set<string>();

  for (const v of variants) {
    let currentSku = v.sku.trim().toUpperCase();

    // If auto-generated and collides with DB or another variant in this form
    if (!v.isManualSku && (takenSkusSet.has(currentSku) || assignedSkus.has(currentSku))) {
      currentSku = await resolveAutoSkuCollisionAsync(currentSku, async (candidate) => {
        if (assignedSkus.has(candidate)) return true;
        const inDb = await prisma.productVariant.findFirst({
          where: { sku: { equals: candidate, mode: "insensitive" } },
          select: { id: true },
        });
        return Boolean(inDb);
      });
    }

    assignedSkus.add(currentSku);
    resolvedVariants.push({
      size: v.size.trim(),
      color: v.color.trim(),
      sku: currentSku,
      price: v.price,
      stock: v.stock,
    });
  }

  // 4. Create product and variants wrapped in try/catch for P2002
  try {
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
          create: resolvedVariants,
        },
      },
    });

    revalidatePath("/admin/products", "page");
    revalidatePath("/", "page");
    revalidatePath("/shop", "page");
    if (product.slug) {
      revalidatePath(`/products/${product.slug}`, "page");
    }

    return { success: true as const, productId: product.id };
  } catch (err: any) {
    console.error("[createProduct DB error]:", err);
    if (err?.code === "P2002") {
      const target = Array.isArray(err?.meta?.target)
        ? err.meta.target.join(", ")
        : String(err?.meta?.target || "");

      if (target.includes("sku")) {
        return {
          success: false as const,
          error: {
            variants: [
              "One or more variant SKUs already exist in the database. Please provide unique SKUs.",
            ],
          },
        };
      }
      if (target.includes("slug")) {
        return {
          success: false as const,
          error: {
            slug: ["A product with this slug already exists."],
          },
        };
      }
    }

    return {
      success: false as const,
      error: {
        name: [err?.message || "Failed to create product due to a database constraint."],
      },
    };
  }
}
