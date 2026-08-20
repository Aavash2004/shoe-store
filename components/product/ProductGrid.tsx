import type { PlaceholderProduct } from "@/types";
import { ProductCard } from "@/components/product/ProductCard";

export function ProductGrid({ products }: { products: PlaceholderProduct[] }) {
  if (products.length === 0) {
    return (
      <div className="py-24 text-center text-[var(--color-navy)]/60">
        No products found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}