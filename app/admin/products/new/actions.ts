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

  // 1. Check for duplicate SKUs within the submitted variants list
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

  // 2. Case-insensitive database check against existing SKUs
  const existingSkus = await prisma.productVariant.findMany({
    where: {
      OR: trimmedSkus.map((s) => ({
        sku: { equals: s, mode: "insensitive" },
      })),
    },
    select: { sku: true },
  });

  if (existingSkus.length > 0) {
    return {
      success: false as const,
      error: { variants: [`SKU "${existingSkus[0].sku}" is already in use by another product`] },
    };
  }

  // 3. Create product and variants wrapped in try/catch to gracefully handle DB constraints
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
          create: variants.map((v) => ({
            size: v.size.trim(),
            color: v.color.trim(),
            sku: v.sku.trim(),
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

