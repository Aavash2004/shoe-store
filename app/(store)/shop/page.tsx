import { ProductGrid } from "@/components/product/ProductGrid";
import { ShopFilters } from "@/components/product/ShopFilters";
import { ScrollReveal } from "@/components/product/ScrollReveal";
import { prisma } from "@/lib/db/prisma";

type SearchParams = {
  category?: string;
  size?: string;
  color?: string;
  sort?: string;
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { category, size, color, sort } = await searchParams;

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      ...(category && { category: { slug: category.toLowerCase() } }),
      ...(size || color
        ? {
            variants: {
              some: {
                isActive: true,
                ...(size && { size }),
                ...(color && { color }),
              },
            },
          }
        : {}),
    },
    include: {
      category: true,
      images: { orderBy: { position: "asc" } },
      variants: { where: { isActive: true } },
    },
  });

  const withPrice = products.map((p) => ({
    ...p,
    minPrice: p.variants.length ? Math.min(...p.variants.map((v) => Number(v.price))) : 0,
  }));

  if (sort === "price-asc") withPrice.sort((a, b) => a.minPrice - b.minPrice);
  if (sort === "price-desc") withPrice.sort((a, b) => b.minPrice - a.minPrice);

  const allProducts = await prisma.product.findMany({
    where: { isActive: true, deletedAt: null },
    include: { category: true, variants: true },
  });

  const categories = Array.from(new Set(allProducts.map((p) => p.category.name)));
  const sizes = Array.from(new Set(allProducts.flatMap((p) => p.variants.map((v) => v.size)))).sort();
  const colors = Array.from(new Set(allProducts.flatMap((p) => p.variants.map((v) => v.color))));

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-navy">
        Shop
      </h1>
      <p className="mt-2 text-navy/70">{withPrice.length} products</p>

      <div className="mt-6">
        <ShopFilters
          categories={categories}
          sizes={sizes}
          colors={colors}
          activeCategory={category}
          activeSize={size}
          activeColor={color}
          activeSort={sort}
        />
      </div>

      <div className="mt-8">
        <ScrollReveal>
          <ProductGrid
            products={withPrice.map((p) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              price: p.minPrice,
              image: p.images[0]?.url ?? "",
              category: p.category.name,
              brand: p.brand ?? "Unknown",
            }))}
          />
        </ScrollReveal>
      </div>
    </div>
  );
}