import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db/prisma";
import { Plus, Package } from "lucide-react";
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
      variants: { where: { isActive: true }, select: { price: true, stock: true } },
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-navy/50">Catalog</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl text-navy">
            Products
          </h1>
          <p className="mt-1 text-sm text-navy/50">
            {products.length} product{products.length !== 1 ? "s" : ""} in catalog
          </p>
        </div>

        <Button asChild size="lg">
          <Link href="/admin/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Empty state */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-y border-sand py-20 text-center">
          <Package className="h-8 w-8 text-navy/30" />
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl text-navy">
            No products yet
          </h2>
          <p className="mt-1 text-sm text-navy/50">Start by adding your first product.</p>
          <Button asChild className="mt-6">
            <Link href="/admin/products/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-sand text-xs uppercase tracking-wide text-navy/45">
                  <th className="py-3 font-medium">Product</th>
                  <th className="py-3 font-medium">Category</th>
                  <th className="py-3 text-right font-medium">Price</th>
                  <th className="py-3 text-right font-medium">Stock</th>
                  <th className="py-3 text-right font-medium">Status</th>
                  <th className="py-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {products.map((product: ProductWithRelations) => {
                  const imageUrl = product.images[0]?.url || "/images/Shoes/s05.avif";
                  const prices = product.variants.map((v) => Number(v.price));
                  const minPrice = prices.length ? Math.min(...prices) : 0;
                  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);

                  return (
                    <tr key={product.id}>
                      <td className="py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-sand">
                            <Image src={imageUrl} alt={product.name} fill className="object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-[family-name:var(--font-display)] text-navy">
                              {product.name}
                            </p>
                            <p className="text-xs text-navy/45">{product.brand || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-navy/60">{product.category?.name || "—"}</td>
                      <td className="py-4 text-right font-medium text-navy">
                        ${minPrice.toFixed(2)}
                      </td>
                      <td className="py-4 text-right">
                        <span className={totalStock <= 5 ? "text-rose-600" : "text-navy"}>
                          {totalStock}
                        </span>
                      </td>
                      <td className="py-4 text-right text-navy/60">
                        {product.isActive ? "Active" : "Draft"}
                      </td>
                      <td className="py-4 text-right">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="text-navy hover:text-accent"
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

          {/* Mobile cards */}
          <div className="flex flex-col divide-y divide-sand md:hidden">
            {products.map((product: ProductWithRelations) => {
              const imageUrl = product.images[0]?.url || "/images/Shoes/s05.avif";
              const prices = product.variants.map((v) => Number(v.price));
              const minPrice = prices.length ? Math.min(...prices) : 0;
              const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);

              return (
                <Link
                  key={product.id}
                  href={`/admin/products/${product.id}`}
                  className="flex items-center gap-4 py-4"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-sand">
                    <Image src={imageUrl} alt={product.name} fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-[family-name:var(--font-display)] text-navy">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-xs text-navy/45">
                      {product.category?.name || "—"} · ${minPrice.toFixed(2)}
                    </p>
                    <p className={`mt-1 text-xs ${totalStock <= 5 ? "text-rose-600" : "text-navy/50"}`}>
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