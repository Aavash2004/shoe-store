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

      ...(category && {
        category: {
          slug: category.toLowerCase(),
        },
      }),

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
      images: {
        orderBy: {
          position: "asc",
        },
      },
      variants: {
        where: {
          isActive: true,
        },
      },
    },
  });

  const withPrice = products.map((product) => ({
    ...product,
    minPrice: product.variants.length
      ? Math.min(...product.variants.map((variant) => Number(variant.price)))
      : 0,
  }));

  if (sort === "price-asc") {
    withPrice.sort((a, b) => a.minPrice - b.minPrice);
  }

  if (sort === "price-desc") {
    withPrice.sort((a, b) => b.minPrice - a.minPrice);
  }

  const allProducts = await prisma.product.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    include: {
      category: true,
      variants: true,
    },
  });

  const categories = Array.from(
    new Set(allProducts.map((product) => product.category.name))
  );

  const sizes = Array.from(
    new Set(
      allProducts.flatMap((product) =>
        product.variants.map((variant) => variant.size)
      )
    )
  ).sort();

  const colors = Array.from(
    new Set(
      allProducts.flatMap((product) =>
        product.variants.map((variant) => variant.color)
      )
    )
  );

  const activeFilterCount = [category, size, color].filter(Boolean).length;

  return (
    <main className="min-h-screen bg-[#F5F2EB] text-[#1E2A38]">
      <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-10 sm:px-8 lg:px-12 lg:pt-16">
        {/* =====================================================
            HEADER
        ====================================================== */}
        <header className="max-w-3xl">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.24em] text-[#1E2A38]/50">
            Collection
          </p>

          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-[0.95] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
            Shop
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-6 text-[#1E2A38]/60 sm:text-base">
            Explore the latest footwear designed for everyday movement,
            comfort, and style.
          </p>
        </header>

        {/* =====================================================
            TOOLBAR
        ====================================================== */}
        <div className="mt-10 border-y border-[#1E2A38]/10 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Product count */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#1E2A38]/50">
                {withPrice.length}{" "}
                {withPrice.length === 1 ? "Product" : "Products"}
              </span>

              {activeFilterCount > 0 && (
                <>
                  <span className="h-1 w-1 rounded-full bg-[#89B4D9]" />

                  <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#89B4D9]">
                    {activeFilterCount}{" "}
                    {activeFilterCount === 1 ? "Filter" : "Filters"} applied
                  </span>
                </>
              )}
            </div>

            {/* Filter controls */}
            <div className="w-full sm:w-auto">
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
          </div>
        </div>

        {/* =====================================================
            ACTIVE FILTER SUMMARY
        ====================================================== */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-5">
            <span className="mr-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#1E2A38]/40">
              Active
            </span>

            {category && (
              <span className="inline-flex items-center border border-[#1E2A38]/10 bg-[#EFECE6] px-3 py-1.5 text-xs text-[#1E2A38]">
                {category}
              </span>
            )}

            {size && (
              <span className="inline-flex items-center border border-[#1E2A38]/10 bg-[#EFECE6] px-3 py-1.5 text-xs text-[#1E2A38]">
                Size {size}
              </span>
            )}

            {color && (
              <span className="inline-flex items-center border border-[#1E2A38]/10 bg-[#EFECE6] px-3 py-1.5 text-xs text-[#1E2A38]">
                {color}
              </span>
            )}
          </div>
        )}

        {/* =====================================================
            PRODUCTS
        ====================================================== */}
        <section className="mt-8">
          {withPrice.length > 0 ? (
            <ScrollReveal>
              <ProductGrid
                products={withPrice.map((product) => ({
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  price: product.minPrice,
                  image: product.images[0]?.url ?? "",
                  category: product.category.name,
                  brand: product.brand ?? "Unknown",
                }))}
              />
            </ScrollReveal>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center border-y border-[#1E2A38]/10 text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#1E2A38]/40">
                No products found
              </p>

              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl">
                Nothing matched your filters.
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-[#1E2A38]/55">
                Try adjusting your filters or explore the full collection.
              </p>

              <a
                href="/shop"
                className="mt-7 inline-flex h-11 items-center justify-center bg-[#1E2A38] px-6 text-xs font-medium uppercase tracking-[0.12em] text-[#F5F2EB] transition-colors duration-200 hover:bg-[#89B4D9] hover:text-[#1E2A38]"
              >
                Clear filters
              </a>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}