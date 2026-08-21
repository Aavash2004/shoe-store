import { ProductGrid } from "@/components/product/ProductGrid";
import { ShopFilters } from "@/components/product/ShopFilters";
import { placeholderProducts } from "@/lib/placeholder-data";
import { ScrollReveal } from "@/components/product/ScrollReveal";

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

  let filtered = [...placeholderProducts];

  if (category) {
    filtered = filtered.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase()
    );
  }

  if (size) {
    filtered = filtered.filter((p) => p.sizes.includes(size));
  }

  if (color) {
    filtered = filtered.filter((p) =>
      p.colors.some((c) => c.toLowerCase() === color.toLowerCase())
    );
  }

  if (sort === "price-asc") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sort === "price-desc") {
    filtered.sort((a, b) => b.price - a.price);
  }

  const categories = Array.from(new Set(placeholderProducts.map((p) => p.category)));
  const sizes = Array.from(new Set(placeholderProducts.flatMap((p) => p.sizes))).sort();
  const colors = Array.from(new Set(placeholderProducts.flatMap((p) => p.colors)));

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-navy)]">
        Shop
      </h1>
      <p className="mt-2 text-[var(--color-navy)]/70">
        {filtered.length} products
      </p>

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
        <ProductGrid products={filtered} />
        </ScrollReveal>
      </div>
    </div>
  );
}