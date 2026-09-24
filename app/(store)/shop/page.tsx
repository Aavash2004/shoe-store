import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, SlidersHorizontal, RotateCcw, Footprints, Sparkles } from "lucide-react";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ShopFilters } from "@/components/product/ShopFilters";
import { ScrollReveal } from "@/components/product/ScrollReveal";
import { prisma } from "@/lib/db/prisma";

export const revalidate = 60;

const PAGE_SIZE = 12;

type SearchParams = {
  category?: string;
  brand?: string;
  size?: string;
  color?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  gender?: string;
  sort?: string;
  q?: string;
  page?: string;
};

async function executeShopQueries(whereClause: any, orderBy: any, skip: number, take: number) {
  const queryAll = async () => {
    const [products, totalCount, dbCategories, dbBrands, dbSizes, dbColors, priceAgg] =
      await Promise.all([
        prisma.product.findMany({
          where: whereClause,
          orderBy,
          include: {
            category: true,
            images: {
              take: 1,
              orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
            },
            variants: {
              where: { isActive: true, deletedAt: null },
            },
          },
          skip,
          take,
        }),
        prisma.product.count({ where: whereClause }),
        prisma.category.findMany({
          select: { name: true },
        }),
        prisma.product.findMany({
          where: { isActive: true, deletedAt: null, brand: { not: null } },
          select: { brand: true },
          distinct: ["brand"],
        }),
        prisma.productVariant.groupBy({
          by: ["size"],
          where: { isActive: true, product: { isActive: true, deletedAt: null } },
        }),
        prisma.productVariant.groupBy({
          by: ["color"],
          where: { isActive: true, product: { isActive: true, deletedAt: null } },
        }),
        prisma.productVariant.aggregate({
          _min: { price: true },
          _max: { price: true },
          where: { isActive: true, product: { isActive: true, deletedAt: null } },
        }),
      ]);

    const categories = Array.from(new Set(dbCategories.map((c) => c.name))).sort();
    const brands = Array.from(
      new Set(dbBrands.map((b) => b.brand).filter(Boolean) as string[])
    ).sort();
    const sizes = Array.from(new Set(dbSizes.map((s) => s.size))).sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      return !isNaN(numA) && !isNaN(numB) ? numA - numB : a.localeCompare(b);
    });
    const colors = Array.from(new Set(dbColors.map((c) => c.color))).sort();

    const catalogMinPrice = priceAgg._min.price ? Math.floor(Number(priceAgg._min.price)) : 0;
    const catalogMaxPrice = priceAgg._max.price ? Math.ceil(Number(priceAgg._max.price)) : 500;

    return [products, totalCount, categories, brands, sizes, colors, catalogMinPrice, catalogMaxPrice] as const;
  };

  try {
    return await queryAll();
  } catch (firstErr) {
    console.warn("[ShopPage DB] Initial query attempt failed, retrying...", firstErr);
    try {
      return await queryAll();
    } catch (retryErr) {
      console.error("[ShopPage DB] Retry query failed:", retryErr);
      return [
        [] as any[],
        0,
        [] as string[],
        [] as string[],
        [] as string[],
        [] as string[],
        0,
        500,
      ] as const;
    }
  }
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const {
    category,
    brand,
    size,
    color,
    minPrice,
    maxPrice,
    inStock,
    gender,
    sort,
    q,
    page,
  } = await searchParams;

  const currentPage = Math.max(1, parseInt(page || "1") || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  // Build high-performance composite WHERE query
  const whereClause: any = {
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
    ...(brand && {
      brand: { equals: brand, mode: "insensitive" },
    }),
    ...(gender && {
      gender: { equals: gender.toUpperCase() },
    }),
  };

  // Nested variant condition combining size, color, price range, and stock
  const variantConditions: any = {
    isActive: true,
    deletedAt: null,
    ...(size && { size }),
    ...(color && { color: { equals: color, mode: "insensitive" } }),
    ...(minPrice && { price: { gte: parseFloat(minPrice) } }),
    ...(maxPrice && { price: { lte: parseFloat(maxPrice) } }),
    ...(inStock === "true" && { stock: { gt: 0 } }),
  };

  if (size || color || minPrice || maxPrice || inStock === "true") {
    whereClause.variants = {
      some: variantConditions,
    };
  }

  // Database-level sorting
  let orderBy: any = { createdAt: "desc" };
  if (sort === "newest") {
    orderBy = { createdAt: "desc" };
  }

  const [
    products,
    totalCount,
    categories,
    brands,
    sizes,
    colors,
    catalogMinPrice,
    catalogMaxPrice,
  ] = await executeShopQueries(whereClause, orderBy, skip, PAGE_SIZE);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const withPrice = products.map((product) => ({
    ...product,
    minPrice: product.variants.length
      ? Math.min(...product.variants.map((v: any) => Number(v.price)))
      : 0,
  }));

  // In-memory sort fallback for price ordering
  if (sort === "price-asc") {
    withPrice.sort((a, b) => a.minPrice - b.minPrice);
  } else if (sort === "price-desc") {
    withPrice.sort((a, b) => b.minPrice - a.minPrice);
  }

  const activeFilterCount = [
    category,
    brand,
    gender,
    size,
    color,
    minPrice || maxPrice ? "price" : undefined,
    inStock === "true" ? "inStock" : undefined,
    q,
  ].filter(Boolean).length;

  function buildHref(
    remove?:
      | "category"
      | "brand"
      | "gender"
      | "size"
      | "color"
      | "price"
      | "inStock"
      | "q"
  ) {
    const params = new URLSearchParams();
    if (q && remove !== "q") params.set("q", q);
    if (category && remove !== "category") params.set("category", category);
    if (brand && remove !== "brand") params.set("brand", brand);
    if (gender && remove !== "gender") params.set("gender", gender);
    if (size && remove !== "size") params.set("size", size);
    if (color && remove !== "color") params.set("color", color);
    if (minPrice && remove !== "price") params.set("minPrice", minPrice);
    if (maxPrice && remove !== "price") params.set("maxPrice", maxPrice);
    if (inStock && remove !== "inStock") params.set("inStock", inStock);
    if (sort) params.set("sort", sort);
    const qs = params.toString();
    return qs ? `/shop?${qs}` : "/shop";
  }

  function buildPageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (brand) params.set("brand", brand);
    if (gender) params.set("gender", gender);
    if (size) params.set("size", size);
    if (color) params.set("color", color);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (inStock) params.set("inStock", inStock);
    if (sort) params.set("sort", sort);
    if (targetPage > 1) params.set("page", targetPage.toString());
    const qs = params.toString();
    return qs ? `/shop?${qs}` : "/shop";
  }

  return (
    <main className="min-h-screen bg-[var(--color-cream)] text-[var(--color-navy)]">
      {/* 1. Collection Banner */}
      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-4">
        <div className="relative h-[220px] sm:h-[260px] lg:h-[300px] overflow-hidden rounded-2xl">
          <Image
            src="/images/hero/h3.avif"
            alt="Editorial Footwear Collection"
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 1440px) 100vw, 1440px"
          />
          <div className="absolute inset-0 bg-[#1E2A38]/40" />
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F5F2EB]">
              Shop Collection
            </h1>
          </div>
        </div>
      </section>

      {/* 2. Main Content Container */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 mt-8 sm:mt-10 pb-20">
        {/* Shop Introduction */}
        <div className="max-w-xl space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#1E2A38]/50 block">
            COLLECTION
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#1E2A38]">
            {q ? `Search: "${q}"` : "All Footwear"}
          </h2>
          <p className="text-xs sm:text-sm text-[#1E2A38]/70 pt-0.5 leading-relaxed">
            {q
              ? `Showing results matching "${q}" across our footwear catalog.`
              : "Explore the latest footwear designed for everyday movement, sport, and lifestyle."}
          </p>
        </div>

        {/* 3. Filter & Sort Toolbar */}
        <div className="mt-6">
          <Suspense fallback={<div className="h-12 w-full animate-pulse bg-[var(--color-cream-alt)] rounded-lg" />}>
            <ShopFilters
              categories={categories}
              brands={brands}
              sizes={sizes}
              colors={colors}
              activeCategory={category}
              activeBrand={brand}
              activeSize={size}
              activeColor={color}
              activeMinPrice={minPrice}
              activeMaxPrice={maxPrice}
              activeInStock={inStock}
              activeGender={gender}
              activeSort={sort}
              totalProducts={totalCount}
              catalogMinPrice={catalogMinPrice}
              catalogMaxPrice={catalogMaxPrice}
            />
          </Suspense>
        </div>

        {/* 4. Active Filters Chips */}
        {activeFilterCount > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E2A38]/50 mr-1">
              Active:
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

            {brand && (
              <Link
                href={buildHref("brand") as any}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-cream-alt)] border border-[#1E2A38]/15 text-[#1E2A38] text-xs font-medium hover:border-[#1E2A38]/40 transition-colors"
              >
                <span>Brand: {brand}</span>
                <span className="text-[#1E2A38]/50 text-xs">×</span>
              </Link>
            )}

            {gender && (
              <Link
                href={buildHref("gender") as any}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-cream-alt)] border border-[#1E2A38]/15 text-[#1E2A38] text-xs font-medium hover:border-[#1E2A38]/40 transition-colors"
              >
                <span>Gender: {gender}</span>
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

            {(minPrice || maxPrice) && (
              <Link
                href={buildHref("price") as any}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-cream-alt)] border border-[#1E2A38]/15 text-[#1E2A38] text-xs font-medium hover:border-[#1E2A38]/40 transition-colors"
              >
                <span>
                  Price: {minPrice ? `$${minPrice}` : "$0"} – {maxPrice ? `$${maxPrice}` : "Any"}
                </span>
                <span className="text-[#1E2A38]/50 text-xs">×</span>
              </Link>
            )}

            {inStock === "true" && (
              <Link
                href={buildHref("inStock") as any}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium hover:border-emerald-300 transition-colors"
              >
                <span>In-Stock Only</span>
                <span className="text-emerald-700/60 text-xs">×</span>
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

        {/* 5. Product Grid or Rich Empty State */}
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
            <div className="py-16 px-6 max-w-lg mx-auto text-center rounded-3xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]/60 shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-sand)]/60 text-[var(--color-navy)]/70 flex items-center justify-center mx-auto">
                <Footprints className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-navy)]">
                  {q ? `No footwear found for "${q}"` : "No shoes match these filters"}
                </h3>
                <p className="text-xs text-[var(--color-navy)]/70 leading-relaxed max-w-sm mx-auto">
                  {activeFilterCount > 0
                    ? "Your combination of filters was too specific. Try expanding your price bracket or clearing selected attributes."
                    : "No footwear items are currently available in this category."}
                </p>
              </div>

              {activeFilterCount > 0 && (
                <div className="pt-2">
                  <Link
                    href="/shop"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-navy)] text-[var(--color-cream)] text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-[var(--color-navy)]/90 transition-colors shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset All Filters</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}