import Link from "next/link";
import Image from "next/image";
import type { PlaceholderProduct } from "@/types";
import { WishlistButton } from "@/components/product/WishlistButton";

export function ProductCard({ product }: { product: PlaceholderProduct }) {

  const bgVariants = [
    "bg-zinc-950",
    "bg-gradient-to-br from-cyan-900 via-teal-800 to-teal-900",
    "bg-gradient-to-br from-stone-300 via-amber-100 to-orange-100",
    "bg-gradient-to-br from-indigo-950 via-blue-900 to-slate-900",
  ];

  // Simple hash so each product gets a consistent background
  const bgIndex =
    product.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    bgVariants.length;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5"
    >
      {/* Image area – richer background */}
      <div
        className={`relative aspect-square overflow-hidden ${bgVariants[bgIndex]}`}
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-100"
        />

        {/* Wishlist Button */}
        <div className="absolute top-3 right-3 z-8">
          <WishlistButton productId={product.id} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-xs uppercase tracking-wider text-[var(--color-navy)]/55">
          {product.brand} || {product.category}
        </p>
        <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg text-[var(--color-navy)] transition-colors group-hover:text-[var(--color-accent)]">
          {product.name}
        </h3>
        <p className="mt-2 text-sm font-medium text-[var(--color-navy)]">
          ${product.price.toFixed(2)}
        </p>
      </div>
    </Link>
  );
}