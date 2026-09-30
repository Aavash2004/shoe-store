"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/authorization";
import { createProductSchema, type CreateProductInput } from "@/lib/validations/product";

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
  const existing = await prisma.product.findUnique({ where: { slug: productData.slug } });
  if (existing) {
    return { success: false as const, error: { slug: ["A product with this slug already exists."] } };
  }

  // 2. Normalize and check for duplicate SKUs within the submitted variants list
  const normalizedVariants = variants.map((v) => ({
    ...v,
    size: v.size.trim(),
    color: v.color.trim(),
    sku: v.sku.trim().toUpperCase(),
  }));

  const normalizedSkus = normalizedVariants.map((v) => v.sku);
  const seenSkus = new Set<string>();
  const duplicateSkisInForm: string[] = [];
  for (const s of normalizedSkus) {
    if (seenSkus.has(s)) {
      duplicateSkisInForm.push(s);
    } else {
      seenSkus.add(s);
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

  // 3. Database check against existing SKUs (normalized uppercase)
  const existingSkus = await prisma.productVariant.findMany({
    where: {
      sku: { in: normalizedSkus },
    },
    select: { sku: true },
  });

  if (existingSkus.length > 0) {
    return {
      success: false as const,
      error: { variants: [`SKU "${existingSkus[0].sku}" is already in use by another product.`] },
    };
  }

  // 4. Create product and variants wrapped in try/catch to gracefully handle DB constraints
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
          create: normalizedVariants.map((v) => ({
            size: v.size,
            color: v.color,
            sku: v.sku,
            price: v.price,
            stock: v.stock,
          })),
        },
      },
    });

    // Revalidate dynamic pages using "page" type argument or concrete path
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
