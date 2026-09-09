"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/authorization";

const UpdateCategorySchema = z.object({
  id: z.string().min(1, "Category ID is required."),
  name: z.string().trim().min(1, "Category name is required.").max(100, "Category name cannot exceed 100 characters."),
  slug: z.string().trim().max(120, "Slug cannot exceed 120 characters.").optional(),
  isActive: z.boolean().optional().default(true),
});

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function updateCategory(
  id: string,
  rawInput: {
    name: string;
    slug?: string;
    isActive?: boolean;
  }
) {
  await requireAdmin();

  const parseResult = UpdateCategorySchema.safeParse({ ...rawInput, id });
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid category data." };
  }

  const { name, isActive } = parseResult.data;
  let slug = (parseResult.data.slug || "").trim();
  if (!slug) {
    slug = generateSlug(name);
  } else {
    slug = generateSlug(slug);
  }

  if (!slug) {
    return { success: false, error: "Invalid category slug." };
  }

  try {
    const existing = await prisma.category.findFirst({
      where: {
        slug,
        NOT: { id },
      },
    });

    if (existing) {
      return { success: false, error: `Category with slug "${slug}" already exists.` };
    }

    await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        isActive: isActive ?? true,
      },
    });

    revalidatePath("/admin/categories");
    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/shop");

    return { success: true };
  } catch (err: any) {
    console.error("[Update Category Error]:", err);
    return { success: false, error: err?.message || "Failed to update category." };
  }
}

export async function deleteCategory(id: string) {
  await requireAdmin();

  const idCheck = z.string().min(1, "Valid category ID is required.").safeParse(id);
  if (!idCheck.success) {
    return { success: false, error: "Invalid category ID." };
  }

  try {
    const category = await prisma.category.findUnique({
      where: { id: idCheck.data },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      return { success: false, error: "Category not found." };
    }

    if (category._count.products > 0) {
      return {
        success: false,
        error: `Cannot delete category containing ${category._count.products} product(s). Move or delete the products first.`,
      };
    }

    await prisma.category.delete({
      where: { id },
    });

    revalidatePath("/admin/categories");
    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/shop");

    return { success: true };
  } catch (err: any) {
    console.error("[Delete Category Error]:", err);
    return { success: false, error: err?.message || "Failed to delete category." };
  }
}
