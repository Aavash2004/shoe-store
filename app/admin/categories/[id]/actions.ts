"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/authorization";

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
  formData: {
    name: string;
    slug?: string;
    isActive?: boolean;
  }
) {
  await requireAdmin();

  const name = formData.name?.trim();
  if (!name) {
    return { success: false, error: "Category name is required." };
  }

  let slug = (formData.slug || "").trim();
  if (!slug) {
    slug = generateSlug(name);
  } else {
    slug = generateSlug(slug);
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
        isActive: formData.isActive ?? true,
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

  try {
    const category = await prisma.category.findUnique({
      where: { id },
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
