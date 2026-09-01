"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

export async function createCategory(formData: {
  name: string;
  slug?: string;
  isActive?: boolean;
}) {
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

  if (!slug) {
    return { success: false, error: "Invalid category slug." };
  }

  try {
    const existing = await prisma.category.findUnique({
      where: { slug },
    });

    if (existing) {
      return { success: false, error: `Category with slug "${slug}" already exists.` };
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        isActive: formData.isActive ?? true,
      },
    });

    revalidatePath("/admin/categories");
    revalidatePath("/admin");

    return { success: true, categoryId: category.id };
  } catch (err: any) {
    console.error("[Create Category Error]:", err);
    return { success: false, error: err?.message || "Failed to create category." };
  }
}
