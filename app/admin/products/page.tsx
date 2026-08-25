import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db/prisma";
import { Plus, Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";


type ProductWithRelations = {
  id: string;
  name: string;
  brand: string | null;
  isActive: boolean;
  category: { name: string } | null;
  images: { url: string }[];
  variants: { price: any; stock: number }[];
};
export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { name: true } },
      images: { where: { isPrimary: true }, take: 1 },
      variants: {
        where: { isActive: true },
        select: { price: true, stock: true },
      },
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-navy)]/55">
            Catalog
          </span>
          <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)]">
            Products
          </h1>
          <p className="mt-1 text-xs text-[var(--color-navy)]/60">
            {products.length} product{products.length !== 1 ? "s" : ""} in catalog
          </p>
        </div>

        <Button asChild className="h-11 rounded-xl px-5">
          <Link href="/admin/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Products Table / Cards */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-sand)]/60">
            <Package className="h-6 w-6 text-[var(--color-navy)]/50" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-navy)]">
            No products yet
          </h2>
          <p className="mt-1 text-sm text-[var(--color-navy)]/60">
            Start by adding your first product.
          </p>
          <Button asChild className="mt-6 rounded-xl">
            <Link href="/admin/products/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--color-sand)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-right">Price</th>
                  <th className="px-6 py-4 text-right">Stock</th>
                  <th className="px-6 py-4 text-right">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-sand)]/70">
                {products.map((product: ProductWithRelations) => {
  const imageUrl = product.images[0]?.url || "/images/Shoes/s05.avif";
  const prices = product.variants.map((v) => Number(v.price));
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
                    0
                  

                  return (
                    <tr
                      key={product.id}
                      className="transition-colors hover:bg-[var(--color-sand)]/20"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--color-sand)] bg-stone-100">
                            <Image
                              src={imageUrl}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[var(--color-navy)]">
                              {product.name}
                            </p>
                            <p className="text-xs text-[var(--color-navy)]/50">
                              {product.brand || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-navy)]/70">
                        {product.category?.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-[var(--color-navy)]">
                        ${minPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`text-sm font-medium ${
                            totalStock <= 5
                              ? "text-rose-600"
                              : "text-[var(--color-navy)]"
                          }`}
                        >
                          {totalStock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            product.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-stone-100 text-stone-500"
                          }`}
                        >
                          {product.isActive ? "Active" : "Draft"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="text-sm font-medium text-[var(--color-navy)] hover:text-[var(--color-accent)]"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="divide-y divide-[var(--color-sand)]/70 md:hidden">
           {products.map((product: ProductWithRelations) => {
  const imageUrl = product.images[0]?.url || "/images/Shoes/s05.avif";
  const prices = product.variants.map((v) => Number(v.price));
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);

              return (
                <Link
                  key={product.id}
                  href={`/admin/products/${product.id}`}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-[var(--color-sand)]/20"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--color-sand)] bg-stone-100">
                    <Image
                      src={imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--color-navy)]">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-navy)]/50">
                      {product.category?.name || "—"} · ${minPrice.toFixed(2)}
                    </p>
                    <p
                      className={`mt-1 text-xs font-medium ${
                        totalStock <= 5 ? "text-rose-600" : "text-[var(--color-navy)]/60"
                      }`}
                    >
                      {totalStock} in stock
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
