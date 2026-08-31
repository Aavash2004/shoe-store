import Link from "next/link";
import { Hero } from "@/components/layout/Hero";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ScrollReveal } from "@/components/product/ScrollReveal";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const categoryChips = [
  { name: "All Shoes", href: "/shop" },
  { name: "Running", href: "/shop?category=running" },
  { name: "Lifestyle", href: "/shop?category=lifestyle" },
  { name: "Training", href: "/shop?category=training" },
  { name: "Basketball", href: "/shop?category=basketball" },
];

const perks = [
  { label: "Free shipping", detail: "On orders over $75" },
  { label: "Easy returns", detail: "30-day window" },
  { label: "Secure checkout", detail: "Encrypted end to end" },
];

export default async function HomePage() {
  // 1. New Arrivals: Newest active products sorted by createdAt desc
  const newArrivalsData = await prisma.product.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 4,
    include: {
      category: true,
      images: { orderBy: { position: "asc" } },
      variants: { where: { isActive: true } },
    },
  });

  // 2. Best Sellers: Computed by OrderItem sales volume
  const topVariants = await prisma.orderItem.groupBy({
    by: ["variantId"],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 8,
  });

  const variantIds = topVariants.map((v) => v.variantId);
  let bestSellersData: typeof newArrivalsData = [];

  if (variantIds.length > 0) {
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { productId: true },
    });
    const bestSellerProductIds = Array.from(
      new Set(variants.map((v) => v.productId))
    );

    bestSellersData = await prisma.product.findMany({
      where: {
        id: { in: bestSellerProductIds },
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
  }

  // Fallback: Fill best sellers with new arrivals if order data is sparse
  if (bestSellersData.length < 4) {
    const existingIds = new Set(bestSellersData.map((p) => p.id));
    const fallbacks = newArrivalsData.filter((p) => !existingIds.has(p.id));
    bestSellersData = [...bestSellersData, ...fallbacks].slice(0, 4);
  }

  const formatProduct = (p: typeof newArrivalsData[number]) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.variants.length
      ? Math.min(...p.variants.map((v) => Number(v.price)))
      : 0,
    image: p.images[0]?.url ?? "/images/Shoes/s05.avif",
    category: p.category?.name ?? "Footwear",
    brand: p.brand ?? "ABXV",
  });

  const newArrivals = newArrivalsData.map(formatProduct);
  const bestSellers = bestSellersData.map(formatProduct);

  return (
    <>
      <Hero />

      {/* Category quick-filter chips bar */}
      <section className="border-b border-[var(--color-navy)]/10 bg-[var(--color-cream-alt)]/60 py-3.5 px-6 overflow-x-auto no-scrollbar">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 sm:gap-3 text-xs font-semibold">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/50 mr-1 hidden sm:inline">
            Explore Categories:
          </span>
          {categoryChips.map((chip) => (
            <Link
              key={chip.name}
              href={chip.href}
              className="shrink-0 rounded-full border border-[var(--color-sand)] bg-[var(--color-cream)] px-4 py-1.5 text-[var(--color-navy)] transition-all duration-200 hover:border-[var(--color-navy)]/40 hover:bg-white hover:shadow-xs active:scale-95"
            >
              {chip.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Perks strip — staggered scroll reveal */}
      <section className="border-b border-navy/10 bg-cream">
        <ScrollReveal selector="[data-perk-item]" stagger={0.07} y={12}>
          <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-navy/10 px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {perks.map((perk) => (
              <div
                key={perk.label}
                data-perk-item
                className="flex flex-col items-center gap-1 py-6 text-center"
              >
                <span className="text-sm font-semibold text-navy">{perk.label}</span>
                <span className="text-xs text-navy/60">{perk.detail}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* Section 1: New Arrivals */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <ScrollReveal selector="[data-reveal-header]">
          <div
            data-reveal-header
            className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end"
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-navy)]/55">
                FRESH DROPS
              </span>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--color-navy)] sm:text-4xl font-bold">
                New Arrivals
              </h2>
              <p className="mt-2.5 max-w-md text-[var(--color-navy)]/70 text-sm sm:text-base">
                Discover our latest footwear drops engineered for performance, movement, and everyday style.
              </p>
            </div>

            <Link
              href="/shop"
              className="group hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--color-navy)]/75 transition-colors hover:text-[var(--color-navy)] sm:flex"
            >
              <span>View all new arrivals</span>
              <span className="transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </ScrollReveal>

        <div className="mt-10 md:mt-12">
          <ScrollReveal selector="[data-product-card]" stagger={0.06}>
            <ProductGrid products={newArrivals} />
          </ScrollReveal>
        </div>

        <div className="mt-10 flex justify-center sm:hidden">
          <Link
            href="/shop"
            className="group flex items-center gap-1.5 text-sm font-semibold text-[var(--color-navy)]/75 transition-colors hover:text-[var(--color-navy)]"
          >
            <span>View all new arrivals</span>
            <span className="transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </section>

      {/* Section 2: Best Sellers (With subtle background contrast) */}
      <section className="bg-[var(--color-cream-alt)]/50 border-t border-[var(--color-sand)]/60 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <ScrollReveal selector="[data-reveal-header]">
            <div
              data-reveal-header
              className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-navy)]/55">
                  CUSTOMER FAVORITES
                </span>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--color-navy)] sm:text-4xl font-bold">
                  Best Sellers
                </h2>
                <p className="mt-2.5 max-w-md text-[var(--color-navy)]/70 text-sm sm:text-base">
                  Explore top-rated shoes loved by the ABXV community.
                </p>
              </div>

              <Link
                href="/shop?sort=price-desc"
                className="group hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--color-navy)]/75 transition-colors hover:text-[var(--color-navy)] sm:flex"
              >
                <span>Explore best sellers</span>
                <span className="transition-transform duration-200 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </ScrollReveal>

          <div className="mt-10 md:mt-12">
            <ScrollReveal selector="[data-product-card]" stagger={0.06}>
              <ProductGrid products={bestSellers} />
            </ScrollReveal>
          </div>

          <div className="mt-10 flex justify-center sm:hidden">
            <Link
              href="/shop?sort=price-desc"
              className="group flex items-center gap-1.5 text-sm font-semibold text-[var(--color-navy)]/75 transition-colors hover:text-[var(--color-navy)]"
            >
              <span>Explore best sellers</span>
              <span className="transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}