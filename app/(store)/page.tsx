import Link from "next/link";
import { Hero } from "@/components/layout/Hero";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ScrollReveal } from "@/components/product/ScrollReveal";
import { placeholderProducts } from "@/lib/placeholder-data";
import { prisma } from "@/lib/db/prisma";
import { features } from "process";


const perks = [
  { label: "Free shipping", detail: "On orders over $75" },
  { label: "Easy returns", detail: "30-day window" },
  { label: "Secure checkout", detail: "Encrypted end to end" },
];
export default async function HomePage() {
  const products = await prisma.product.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      category: true,
      images: { orderBy: { position: "asc" } },
      variants: { where: { isActive: true } },
    },
  });

 const featured = products.map((p: (typeof products)[number]) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
   price: p.variants.length
  ? Math.min(...p.variants.map((v: (typeof p.variants)[number]) => Number(v.price)))
  : 0,
    image: p.images[0]?.url ?? "",
    category: p.category.name,
    brand: p.brand ?? "Unknown",
  }));

  return (
    <>
      <Hero />

      {/* Perks strip — bridges the dark hero into the cream body */}
      <section className="border-b border-navy/10 bg-cream">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-navy/10 px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {perks.map((perk) => (
            <div key={perk.label} className="flex flex-col items-center gap-1 py-6 text-center">
              <span className="text-sm font-semibold text-navy">{perk.label}</span>
              <span className="text-xs text-navy/60">{perk.detail}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Shoes */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <ScrollReveal>
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-navy sm:text-4xl">
                Featured Shoes
              </h2>
              <p className="mt-3 max-w-md text-navy/70">
                comfort, craft and everyday wear.
              </p>
            </div>

            <Link
              href="/shop"
              className="group hidden shrink-0 items-center gap-1.5 text-sm font-medium text-navy/70 transition-colors hover:text-navy sm:flex"
            >
              View all
              <span className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          </div>

          
        </ScrollReveal>

        <div className="mt-10 md:mt-12">
          <ScrollReveal>
            <ProductGrid products={featured} />
          </ScrollReveal>
        </div>

        {/* Mobile-only view all, sits under the grid instead of cramping the header */}
        <div className="mt-10 flex justify-center sm:hidden">
          <Link
            href="/shop"
            className="group flex items-center gap-1.5 text-sm font-medium text-navy/70 transition-colors hover:text-navy"
          >
            View all shoes
            <span className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}