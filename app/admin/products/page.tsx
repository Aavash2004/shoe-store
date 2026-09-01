import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db/prisma";
import { Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type ProductWithRelations = {
  id: string;
  name: string;
  brand: string | null;
  isActive: boolean;
  category: { name: string } | null;
  images: { url: string }[];
  variants: { price: any; stock: number }[];
};

async function executeAdminProductsQueries() {
  const fetchProducts = () =>
    prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true } },
        images: { orderBy: { position: "asc" }, take: 1 },
        variants: { select: { price: true, stock: true } },
      },
    });

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fetchProducts();
    } catch (err) {
      console.warn(`[AdminProductsPage DB] Attempt ${attempt} failed:`, err);
      if (attempt === 3) break;
      await new Promise((res) => setTimeout(res, 250 * attempt));
    }
  }

  // Fallback to basic findMany without nested includes if socket flickers
  try {
    return await prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true } },
        images: { take: 1 },
        variants: { select: { price: true, stock: true } },
      },
    });
  } catch (fallbackErr) {
    console.error("[AdminProductsPage DB] Final fallback failed:", fallbackErr);
    return [];
  }
}

export default async function AdminProductsPage() {
  const products = await executeAdminProductsQueries();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-navy)]/55">
            Catalog
          </span>
          <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-[var(--color-navy)]">
            Products
          </h1>
          <p className="mt-1 text-xs text-[var(--color-navy)]/60">
            {products.length} product{products.length !== 1 ? "s" : ""} in catalog
          </p>
        </div>

        <Button asChild className="h-11 rounded-xl px-5 shadow-2xs">
          <Link href="/admin/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Empty State */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] py-20 text-center shadow-2xs">
          <Package className="mb-4 h-10 w-10 text-[var(--color-navy)]/30" />
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-navy)]">
            No products yet
          </h2>
          <p className="mt-1 text-xs text-[var(--color-navy)]/60">Start by adding your first product.</p>
          <Button asChild className="mt-6 rounded-xl">
            <Link href="/admin/products/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] shadow-2xs md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-sand)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
                  <th className="px-6 py-4 font-bold">Product</th>
                  <th className="px-6 py-4 font-bold">Category</th>
                  <th className="px-6 py-4 text-right font-bold">Price</th>
                  <th className="px-6 py-4 text-right font-bold">Stock</th>
                  <th className="px-6 py-4 text-right font-bold">Status</th>
                  <th className="px-6 py-4 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-sand)]/70">
                {products.map((product: ProductWithRelations) => {
                  const imageUrl = product.images[0]?.url || "/images/Shoes/gmm.jpeg";
                  const prices = product.variants.map((v) => Number(v.price));
                  const minPrice = prices.length ? Math.min(...prices) : 0;
                  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);

                  return (
                    <tr key={product.id} className="hover:bg-[var(--color-sand)]/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--color-cream)] border border-[var(--color-sand)]">
                            <Image src={imageUrl} alt={product.name} fill className="object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-[family-name:var(--font-display)] font-semibold text-[var(--color-navy)]">
                              {product.name}
                            </p>
                            <p className="text-xs text-[var(--color-navy)]/50">{product.brand || "ABXV"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-navy)]/70">{product.category?.name || "—"}</td>
                      <td className="px-6 py-4 text-right font-bold text-[var(--color-navy)]">
                        ${minPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={totalStock <= 5 ? "font-bold text-rose-600" : "text-[var(--color-navy)]"}>
                          {totalStock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-semibold text-[var(--color-navy)]/70">
                        {product.isActive ? (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700">Active</span>
                        ) : (
                          <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-stone-600">Draft</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="text-xs font-semibold text-[var(--color-navy)] hover:text-[var(--color-sky)] transition-colors"
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
          <div className="flex flex-col divide-y divide-[var(--color-sand)] rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] md:hidden">
            {products.map((product: ProductWithRelations) => {
              const imageUrl = product.images[0]?.url || "/images/Shoes/gmm.jpeg";
              const prices = product.variants.map((v) => Number(v.price));
              const minPrice = prices.length ? Math.min(...prices) : 0;
              const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);

              return (
                <Link
                  key={product.id}
                  href={`/admin/products/${product.id}`}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-[var(--color-sand)]/20 transition-colors"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--color-cream)] border border-[var(--color-sand)]">
                    <Image src={imageUrl} alt={product.name} fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-[family-name:var(--font-display)] font-semibold text-[var(--color-navy)]">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-navy)]/60">
                      {product.category?.name || "—"} · ${minPrice.toFixed(2)}
                    </p>
                    <p className={`mt-1 text-xs ${totalStock <= 5 ? "font-semibold text-rose-600" : "text-[var(--color-navy)]/50"}`}>
                      {totalStock} in stock
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}