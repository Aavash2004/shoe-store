"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/authorization";

const CreateCategorySchema = z.object({
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

export async function createCategory(rawInput: {
  name: string;
  slug?: string;
  isActive?: boolean;
}) {
  await requireAdmin();

  const parseResult = CreateCategorySchema.safeParse(rawInput);
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
        isActive: isActive ?? true,
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
