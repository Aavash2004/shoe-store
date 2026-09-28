import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryTableClient } from "@/components/admin/CategoryTableClient";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { products: true } },
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-navy)]/55">
            Catalog Management
          </span>
          <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)]">
            Categories
          </h1>
          <p className="mt-1 text-xs text-[var(--color-navy)]/60">
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"} · Manage seasonal visibility and product grouping
          </p>
        </div>

        <Button asChild className="h-11 rounded-xl bg-[var(--color-navy)] px-5 text-white hover:opacity-90">
          <Link href="/admin/categories/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Link>
        </Button>
      </div>

      <CategoryTableClient
        initialCategories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          isActive: c.isActive,
          _count: c._count,
        }))}
      />
    </div>
  );
}