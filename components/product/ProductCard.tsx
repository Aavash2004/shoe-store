import Link from "next/link";
import Image from "next/image";
import type { PlaceholderProduct } from "@/types";

export function ProductCard({ product }: { product: PlaceholderProduct }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-lg border border-[var(--color-sand)] bg-[var(--color-cream-alt)] transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[var(--color-sand)]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="p-4">
        <p className="text-xs uppercase tracking-wide text-[var(--color-navy)]/60">
          {product.category}
        </p>
        <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg text-[var(--color-navy)]">
          {product.name}
        </h3>
        <p className="mt-2 text-sm font-medium text-[var(--color-navy)]">
          ${product.price.toFixed(2)}
        </p>
      </div>
    </Link>
  );
}