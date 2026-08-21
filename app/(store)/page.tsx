import { Hero } from "@/components/layout/Hero";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ScrollReveal } from "@/components/product/ScrollReveal";
import { placeholderProducts } from "@/lib/placeholder-data";

export default function HomePage() {
  return (
    <>
      <Hero />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-navy">
          Featured Shoes
        </h2>
        <p className="mt-2 text-navy/70">
          A few favorites from the collection.
        </p>

        <div className="mt-8">
          <ScrollReveal>
            <ProductGrid products={placeholderProducts} />
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}