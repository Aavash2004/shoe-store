"use client";

import { useState } from "react";
import Link from "next/link";
import type { PlaceholderProduct } from "@/types";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ScrollReveal } from "@/components/product/ScrollReveal";

interface HomeProductTabsProps {
  newArrivals: PlaceholderProduct[];
  bestSellers: PlaceholderProduct[];
}

export function HomeProductTabs({
  newArrivals,
  bestSellers,
}: HomeProductTabsProps) {
  const [activeTab, setActiveTab] = useState<"new" | "best">("new");
  const products = activeTab === "new" ? newArrivals : bestSellers;

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
      <ScrollReveal selector="[data-reveal-header]">
        <div
          data-reveal-header
          className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end"
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-navy)]/55">
              CURATED SELECTION
            </span>
            <div className="mt-2 flex items-center gap-3 sm:gap-5 border-b border-[var(--color-sand)] pb-2.5">
              <button
                type="button"
                onClick={() => setActiveTab("new")}
                className={`font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold transition-all relative ${activeTab === "new"
                    ? "text-[var(--color-navy)] after:absolute after:-bottom-3 after:left-0 after:h-0.5 after:w-full after:bg-[var(--color-navy)]"
                    : "text-[var(--color-navy)]/40 hover:text-[var(--color-navy)]/70"
                  }`}
              >
                New Arrivals
              </button>
              <span className="text-[var(--color-navy)]/30 text-xl font-light">
                /
              </span>
              <button
                type="button"
                onClick={() => setActiveTab("best")}
                className={`font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold transition-all relative ${activeTab === "best"
                    ? "text-[var(--color-navy)] after:absolute after:-bottom-3 after:left-0 after:h-0.5 after:w-full after:bg-[var(--color-navy)]"
                    : "text-[var(--color-navy)]/40 hover:text-[var(--color-navy)]/70"
                  }`}
              >
                Best Sellers
              </button>
            </div>
          </div>

          <Link
            href="/shop"
            className="group hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--color-navy)]/75 transition-colors hover:text-[var(--color-navy)] sm:flex"
          >
            <span>
              View all {activeTab === "new" ? "new arrivals" : "best sellers"}
            </span>
            <span className="transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </ScrollReveal>

      {/* Grid container with tab animation key */}
      <div key={activeTab} className="mt-10 md:mt-12">
        <ScrollReveal selector="[data-product-card]" stagger={0.06}>
          <ProductGrid products={products} />
        </ScrollReveal>
      </div>

      {/* Mobile-only View All CTA */}
      <div className="mt-10 flex justify-center sm:hidden">
        <Link
          href="/shop"
          className="group flex items-center gap-1.5 text-sm font-semibold text-[var(--color-navy)]/75 transition-colors hover:text-[var(--color-navy)]"
        >
          <span>
            View all {activeTab === "new" ? "new arrivals" : "best sellers"}
          </span>
          <span className="transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
