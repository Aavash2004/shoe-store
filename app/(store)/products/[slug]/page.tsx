import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductDetailInteractive } from "@/components/product/ProductDetailInteractive";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ScrollReveal } from "@/components/product/ScrollReveal";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await prisma.product.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    include: {
      category: true,
      images: { orderBy: { position: "asc" } },
      variants: { where: { isActive: true } },
    },
  });

  if (!product) {
    notFound();
  }

  // Fetch up to 4 related products from the same category (excluding current product)
  let relatedProducts = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: product.id },
      isActive: true,
      deletedAt: null,
    },
    take: 4,
    include: {
      category: true,
      images: { orderBy: { position: "asc" } },
      variants: { where: { isActive: true } },
    },
  });

  // Fallback: If fewer than 4 products in same category, fill with other active products
  if (relatedProducts.length < 4) {
    const existingIds = [product.id, ...relatedProducts.map((p) => p.id)];
    const additional = await prisma.product.findMany({
      where: {
        id: { notIn: existingIds },
        isActive: true,
        deletedAt: null,
      },
      take: 4 - relatedProducts.length,
      include: {
        category: true,
        images: { orderBy: { position: "asc" } },
        variants: { where: { isActive: true } },
      },
    });
    relatedProducts = [...relatedProducts, ...additional];
  }

  const sizes = Array.from(new Set(product.variants.map((v) => v.size))).sort();
  const colors = Array.from(new Set(product.variants.map((v) => v.color)));
  const minPrice = product.variants.length
    ? Math.min(...product.variants.map((v) => Number(v.price)))
    : 0;

  const formattedRelated = relatedProducts.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.variants.length
      ? Math.min(...p.variants.map((v) => Number(v.price)))
      : 0,
    image: p.images[0]?.url ?? "/images/Shoes/s05.avif",
    category: p.category?.name ?? "Footwear",
    brand: p.brand ?? "ABXV",
  }));

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Product Main Detail Grid */}
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <ProductGallery images={product.images.map((img) => img.url)} />
        <ProductDetailInteractive
          product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: minPrice,
            image: product.images[0]?.url ?? "",
            category: product.category.name,
            brand: product.brand ?? "ABXV",
            description: product.description,
            images: product.images.map((img) => img.url),
            sizes,
            colors,
            variants: product.variants.map((v) => ({
              id: v.id,
              size: v.size,
              color: v.color,
              price: Number(v.price),
              stock: v.stock,
            })),
          }}
        />
      </div>

      {/* Related Products Section */}
      {formattedRelated.length > 0 && (
        <section className="mt-20 border-t border-[var(--color-sand)]/70 pt-16">
          <ScrollReveal selector="[data-reveal-header]">
            <div
              data-reveal-header
              className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-navy)]/55">
                  MORE FROM {product.category.name.toUpperCase()}
                </span>
                <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[var(--color-navy)] mt-1">
                  You Might Also Like
                </h2>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal selector="[data-product-card]" stagger={0.06}>
            <ProductGrid products={formattedRelated} />
          </ScrollReveal>
        </section>
      )}
    </div>
  );
}