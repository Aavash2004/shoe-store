import { Prisma } from "@/lib/generated/prisma/client";

/**
 * Filter for active, non-deleted products that belong to active categories.
 * Single source of truth for public storefront product visibility.
 */
export function publicProductWhere(): Prisma.ProductWhereInput {
  return {
    isActive: true,
    deletedAt: null,
    category: {
      isActive: true,
    },
  };
}

/**
 * Filter for active categories in public storefront navigation and filters.
 */
export function publicCategoryWhere(): Prisma.CategoryWhereInput {
  return {
    isActive: true,
  };
}

/**
 * Filter for active product variants belonging to active, non-deleted products in active categories.
 */
export function publicVariantWhere(): Prisma.ProductVariantWhereInput {
  return {
    isActive: true,
    product: {
      isActive: true,
      deletedAt: null,
      category: {
        isActive: true,
      },
    },
  };
}
