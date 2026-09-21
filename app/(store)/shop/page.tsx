import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ShopFilters } from "@/components/product/ShopFilters";
import { ScrollReveal } from "@/components/product/ScrollReveal";
import { prisma } from "@/lib/db/prisma";

export const revalidate = 60;

const PAGE_SIZE = 12;

type SearchParams = {
  category?: string;
  size?: string;
  color?: string;
  sort?: string;
  q?: string;
  page?: string;
};

async function executeShopQueries(whereClause: any, skip: number, take: number) {
  const queryAll = async () => {
    const [products, totalCount, dbCategories, dbSizes, dbColors] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          category: true,
          images: { orderBy: { position: "asc" } },
          variants: { where: { isActive: true } },
        },
        skip,
        take,
      }),
      prisma.product.count({ where: whereClause }),
      prisma.category.findMany({
        select: { name: true },
      }),
      prisma.productVariant.groupBy({
        by: ["size"],
        where: { isActive: true, product: { isActive: true, deletedAt: null } },
      }),
      prisma.productVariant.groupBy({
        by: ["color"],
        where: { isActive: true, product: { isActive: true, deletedAt: null } },
      }),
    ]);

    const sizes = dbSizes.map((s) => s.size);
    const colors = dbColors.map((c) => c.color);

    return [products, totalCount, dbCategories, sizes, colors] as const;
  };

  try {
    return await queryAll();
  } catch (firstErr) {
    console.warn("[ShopPage DB] Initial query attempt failed, retrying...", firstErr);
    try {
      return await queryAll();
    } catch (retryErr) {
      console.error("[ShopPage DB] Retry query failed:", retryErr);
      return [[], 0, [], [], []] as const;
    }
  }
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { category, size, color, sort, q, page } = await searchParams;

  const currentPage = Math.max(1, parseInt(page || "1") || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const whereClause = {
    isActive: true,
    deletedAt: null,
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    }),
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
  };

  const [products, totalCount, dbCategories, dbSizes, dbColors] = await executeShopQueries(
    whereClause,
    skip,
    PAGE_SIZE
  );

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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

  const categories = Array.from(new Set(dbCategories.map((c) => c.name)));
  const sizes = Array.from(new Set(dbSizes)).sort();
  const colors = Array.from(new Set(dbColors));

  const activeFilterCount = [category, size, color, q].filter(Boolean).length;

  function buildHref(remove?: "category" | "size" | "color" | "q") {
    const params = new URLSearchParams();
    if (q && remove !== "q") params.set("q", q);
    if (category && remove !== "category") params.set("category", category);
    if (size && remove !== "size") params.set("size", size);
    if (color && remove !== "color") params.set("color", color);
    if (sort) params.set("sort", sort);
    const qs = params.toString();
    return qs ? `/shop?${qs}` : "/shop";
  }

  function buildPageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (size) params.set("size", size);
    if (color) params.set("color", color);
    if (sort) params.set("sort", sort);
    if (targetPage > 1) params.set("page", targetPage.toString());
    const qs = params.toString();
    return qs ? `/shop?${qs}` : "/shop";
  }

  return (
    <main className="min-h-screen bg-[var(--color-cream)] text-[var(--color-navy)]">
      {/* 1. Collection Banner */}
      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-4">
        <div className="relative h-[240px] sm:h-[280px] lg:h-[320px] overflow-hidden rounded-2xl">
          <Image
            src="/images/hero/h3.avif"
            alt="Editorial Footwear Collection"
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 1440px) 100vw, 1440px"
          />
          <div className="absolute inset-0 bg-[#1E2A38]/35" />
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F5F2EB]">
              Shop Collection
            </h1>
          </div>
        </div>
      </section>

      {/* 2. Main Content Container */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 mt-10 sm:mt-12 pb-20">
        {/* Shop Introduction */}
        <div className="max-w-xl space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#1E2A38]/50 block">
            COLLECTION
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-[#1E2A38]">
            {q ? `Search Results: "${q}"` : "Shop"}
          </h2>
          <p className="text-xs sm:text-sm text-[#1E2A38]/70 pt-1 leading-relaxed">
            {q
              ? `Showing results matching "${q}" across our collection.`
              : "Explore the latest footwear designed for everyday movement, comfort, and style."}
          </p>
        </div>

        {/* 3. Filter & Sort Toolbar */}
        <div className="mt-7">
          <Suspense fallback={<div className="h-12 w-full animate-pulse bg-[var(--color-cream-alt)] rounded-lg" />}>
            <ShopFilters
              categories={categories}
              sizes={sizes}
              colors={colors}
              activeCategory={category}
              activeSize={size}
              activeColor={color}
              activeSort={sort}
              totalProducts={totalCount}
            />
          </Suspense>
        </div>

        {/* 4. Active Filters Chips (Only rendered when filters exist) */}
        {activeFilterCount > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E2A38]/50 mr-1">
              Active Filters
            </span>

            {q && (
              <Link
                href={buildHref("q") as any}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-cream-alt)] border border-[#1E2A38]/15 text-[#1E2A38] text-xs font-medium hover:border-[#1E2A38]/40 transition-colors"
              >
                <span>Query: &ldquo;{q}&rdquo;</span>
                <span className="text-[#1E2A38]/50 text-xs">×</span>
              </Link>
            )}

            {category && (
              <Link
                href={buildHref("category") as any}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-cream-alt)] border border-[#1E2A38]/15 text-[#1E2A38] text-xs font-medium hover:border-[#1E2A38]/40 transition-colors"
              >
                <span>Category: {category}</span>
                <span className="text-[#1E2A38]/50 text-xs">×</span>
              </Link>
            )}

            {size && (
              <Link
                href={buildHref("size") as any}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-cream-alt)] border border-[#1E2A38]/15 text-[#1E2A38] text-xs font-medium hover:border-[#1E2A38]/40 transition-colors"
              >
                <span>Size: {size}</span>
                <span className="text-[#1E2A38]/50 text-xs">×</span>
              </Link>
            )}

            {color && (
              <Link
                href={buildHref("color") as any}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-cream-alt)] border border-[#1E2A38]/15 text-[#1E2A38] text-xs font-medium hover:border-[#1E2A38]/40 transition-colors"
              >
                <span>Color: {color}</span>
                <span className="text-[#1E2A38]/50 text-xs">×</span>
              </Link>
            )}

            <Link
              href="/shop"
              className="ml-2 text-xs font-semibold text-[#1E2A38]/60 hover:text-[#1E2A38] underline transition-colors"
            >
              Clear all
            </Link>
          </div>
        )}

        {/* 5. Product Grid or Empty State */}
        <section className="mt-8">
          {withPrice.length > 0 ? (
            <>
              <ScrollReveal>
                <ProductGrid
                  products={withPrice.map((product) => ({
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    price: product.minPrice,
                    image: product.images[0]?.url ?? "/images/Shoes/s05.avif",
                    category: product.category.name,
                    brand: product.brand ?? "",
                  }))}
                />
              </ScrollReveal>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-14 flex items-center justify-center gap-2">
                  {currentPage > 1 ? (
                    <Link
                      href={buildPageHref(currentPage - 1) as any}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-sand)] bg-white text-[var(--color-navy)] hover:bg-[var(--color-sand)]/20 transition-colors shadow-2xs"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-sand)]/50 bg-stone-50 text-[var(--color-navy)]/30 cursor-not-allowed">
                      <ChevronLeft className="h-4 w-4" />
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 px-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      const isCurrent = pageNum === currentPage;
                      return (
                        <Link
                          key={pageNum}
                          href={buildPageHref(pageNum) as any}
                          className={`inline-flex h-10 min-w-10 px-3 items-center justify-center rounded-xl text-xs font-bold transition-all shadow-2xs ${
                            isCurrent
                              ? "bg-[var(--color-navy)] text-[var(--color-cream)] shadow-xs"
                              : "border border-[var(--color-sand)] bg-white text-[var(--color-navy)] hover:bg-[var(--color-sand)]/20"
                          }`}
                        >
                          {pageNum}
                        </Link>
                      );
                    })}
                  </div>

                  {currentPage < totalPages ? (
                    <Link
                      href={buildPageHref(currentPage + 1) as any}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-sand)] bg-white text-[var(--color-navy)] hover:bg-[var(--color-sand)]/20 transition-colors shadow-2xs"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-sand)]/50 bg-stone-50 text-[var(--color-navy)]/30 cursor-not-allowed">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[#1E2A38]/40">
                {q ? `NO RESULTS FOUND FOR "${q.toUpperCase()}"` : "NO SHOES FOUND"}
              </p>
              <p className="text-sm text-[#1E2A38]/60 max-w-sm mx-auto">
                {q
                  ? `We couldn't find any shoes matching "${q}". Try checking your spelling or search for another model.`
                  : "Try adjusting your filters or clear them to view the full collection."}
              </p>
              <div>
                <Link
                  href="/shop"
                  className="inline-block mt-3 px-5 py-2.5 bg-[#1E2A38] text-[#F5F2EB] text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-[#1E2A38]/90 transition-colors shadow-xs"
                >
                  {q ? "Clear Search" : "Clear Filters"}
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}