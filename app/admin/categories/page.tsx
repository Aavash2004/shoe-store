import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { Plus, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";


type CategoryWithCount = {
  id: string;
  name: string;
  _count: {
    products: number;
  };
};

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
            Catalog
          </span>
          <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)]">
            Categories
          </h1>
          <p className="mt-1 text-xs text-[var(--color-navy)]/60">
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
          </p>
        </div>

        <Button asChild className="h-11 rounded-xl px-5">
          <Link href="/admin/categories/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Link>
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] py-20 text-center">
          <FolderOpen className="mb-4 h-10 w-10 text-[var(--color-navy)]/40" />
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-navy)]">
            No categories yet
          </h2>
          <Button asChild className="mt-6 rounded-xl">
            <Link href="/admin/categories/new">Add Category</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--color-sand)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4 text-right">Products</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-sand)]/70">
         {categories.map((cat: CategoryWithCount) => (
  <tr key={cat.id} className="hover:bg-[var(--color-sand)]/20">
    <td className="px-6 py-4 font-medium text-[var(--color-navy)]">
      {cat.name}
    </td>
    <td className="px-6 py-4 text-right text-sm text-[var(--color-navy)]/70">
      {cat._count.products}
    </td>
    <td className="px-6 py-4 text-right">
      <Link
        href={`/admin/categories/${cat.id}`}
        className="text-sm font-medium text-[var(--color-navy)] hover:text-[var(--color-accent)]"
      >
        Edit
      </Link>
    </td>
  </tr>
))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}