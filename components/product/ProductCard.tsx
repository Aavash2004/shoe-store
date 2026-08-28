"use client";

import Link from "next/link";
import Image from "next/image";
import type { PlaceholderProduct } from "@/types";
import { WishlistButton } from "@/components/product/WishlistButton";

export function ProductCard({ product }: { product: PlaceholderProduct }) {
  const hasValidBrand =
    product.brand &&
    product.brand.trim().toUpperCase() !== "UNKNOWN" &&
    product.brand.trim() !== "";

  const metadata = hasValidBrand
    ? `${product.brand.toUpperCase()} · ${product.category.toUpperCase()}`
    : product.category.toUpperCase();

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-xl border border-[var(--color-sand)]/80 bg-[var(--color-cream-alt)]/60 transition-all duration-300 hover:border-[var(--color-navy)]/30 hover:shadow-sm"
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-stone-200/60">
        <Image
          src={product.image || "/images/Shoes/s05.avif"}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Subtle Wishlist Button */}
        <div className="absolute top-2.5 right-2.5 z-10" onClick={(e) => e.preventDefault()}>
          <div className="p-1 rounded-full bg-[var(--color-cream)]/85 backdrop-blur-xs border border-[var(--color-sand)]/60 shadow-xs transition-transform hover:scale-105">
            <WishlistButton productId={product.id} />
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-3.5 sm:p-4 space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-navy)]/55 truncate">
          {metadata}
        </p>

        <h3 className="font-[family-name:var(--font-display)] text-sm sm:text-base font-bold text-[var(--color-navy)] transition-colors group-hover:text-[var(--color-sky)] truncate">
          {product.name}
        </h3>

        <p className="text-xs sm:text-sm font-semibold text-[var(--color-navy)] pt-0.5">
          ${product.price.toFixed(2)}
        </p>
      </div>
    </Link>
  );
}