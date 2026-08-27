import Image from "next/image";
import Link from "next/link";
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
        category: { slug: category.toLowerCase() },
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
      images: { orderBy: { position: "asc" } },
      variants: { where: { isActive: true } },
    },
  });

  const withPrice = products.map((product) => ({
    ...product,
    minPrice: product.variants.length
      ? Math.min(...product.variants.map((v) => Number(v.price)))
      : 0,
  }));

  if (sort === "price-asc") {
    withPrice.sort((a, b) => a.minPrice - b.minPrice);
  }
  if (sort === "price-desc") {
    withPrice.sort((a, b) => b.minPrice - a.minPrice);
  }

  const allProducts = await prisma.product.findMany({
    where: { isActive: true, deletedAt: null },
    include: { category: true, variants: true },
  });

  const categories = Array.from(
    new Set(allProducts.map((p) => p.category.name))
  );
  const sizes = Array.from(
    new Set(allProducts.flatMap((p) => p.variants.map((v) => v.size)))
  ).sort();
  const colors = Array.from(
    new Set(allProducts.flatMap((p) => p.variants.map((v) => v.color)))
  );

  const activeFilterCount = [category, size, color].filter(Boolean).length;


  function buildHref(remove?: "category" | "size" | "color") {
    const params = new URLSearchParams();
    if (category && remove !== "category") params.set("category", category);
    if (size && remove !== "size") params.set("size", size);
    if (color && remove !== "color") params.set("color", color);
    if (sort) params.set("sort", sort);
    const qs = params.toString();
    return qs ? `/shop?${qs}` : "/shop";
  }

  return (
    <main className="min-h-screen bg-[#F5F2EB] text-[#1E2A38]">
      {/* Collection banner */}
      <section className="mx-auto max-w-[1440px] px-5 pt-4 sm:px-8 lg:px-12">
        <div className="relative h-[220px] overflow-hidden rounded-[10px] sm:h-[280px] lg:h-[320px]">
          <Image
            src="/images/hero/h3.avif"
            alt="The New Collection"
            fill
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[#1E2A38]/40" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
           
            <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#F5F2EB]/85">
             <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-[36px] leading-[0.95] tracking-[-0.02em] text-[#1E2A38] sm:text-[42px]">
            Shop
            </h1>
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-12 sm:px-8 lg:px-12 lg:pt-14">
 <header className="max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#1E2A38]/45">
            Collection
          </p>
        </header>
        {/* Toolbar */}
        <div className="mt-9 flex flex-col gap-3 border-y border-[#1E2A38]/10 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#1E2A38]/50">
            {withPrice.length}{" "}
            {withPrice.length === 1 ? "Product" : "Products"}
            {activeFilterCount > 0 && (
              <span className="text-[#89B4D9]">
                {" "}
                · {activeFilterCount} filter
                {activeFilterCount > 1 ? "s" : ""}
              </span>
            )}
          </p>

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

        {/* Active filters */}
        {activeFilterCount > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[#1E2A38]/40">
              Active
            </span>
            {category && (
              <Link
                href={buildHref("category")}
                className="inline-flex items-center gap-1.5 border border-[#1E2A38]/10 bg-[#EFECE6] px-2.5 py-1 text-[12px] text-[#1E2A38] transition hover:border-[#1E2A38]/25"
              >
                {category}
                <span className="text-[#1E2A38]/40">×</span>
              </Link>
            )}
            {size && (
              <Link
                href={buildHref("size")}
                className="inline-flex items-center gap-1.5 border border-[#1E2A38]/10 bg-[#EFECE6] px-2.5 py-1 text-[12px] text-[#1E2A38] transition hover:border-[#1E2A38]/25"
              >
                Size {size}
                <span className="text-[#1E2A38]/40">×</span>
              </Link>
            )}
            {color && (
              <Link
                href={buildHref("color")}
                className="inline-flex items-center gap-1.5 border border-[#1E2A38]/10 bg-[#EFECE6] px-2.5 py-1 text-[12px] text-[#1E2A38] transition hover:border-[#1E2A38]/25"
              >
                {color}
                <span className="text-[#1E2A38]/40">×</span>
              </Link>
            )}
            <Link
              href="/shop"
              className="ml-1 text-[12px] font-medium text-[#1E2A38]/50 transition hover:text-[#1E2A38]"
            >
              Clear all
            </Link>
          </div>
        )}

        {/* Products */}
        <section className="mt-7">
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
                  brand: product.brand ?? "",
                }))}
              />
            </ScrollReveal>
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center border-y border-[#1E2A38]/10 text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#1E2A38]/40">
                No shoes found
              </p>
              <h2 className="mt-2.5 font-[family-name:var(--font-display)] text-[26px] text-[#1E2A38]">
                Nothing matched your filters.
              </h2>
              <p className="mt-2 max-w-sm text-[14px] text-[#1E2A38]/50">
                Try adjusting your filters or explore the full collection.
              </p>
              <Link
                href="/shop"
                className="mt-6 inline-flex h-10 items-center bg-[#1E2A38] px-5 text-[12px] font-medium uppercase tracking-[0.1em] text-[#F5F2EB] transition hover:bg-[#89B4D9] hover:text-[#1E2A38]"
              >
                Clear filters
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}