import { ProductGrid } from "@/components/product/ProductGrid";
import type { PlaceholderProduct } from "@/types";

const placeholderProducts: PlaceholderProduct[] = [
  {
    id: "1",
    name: "Cloud Runner",
    slug: "cloud-runner",
    price: 129,
    image: "https://picsum.photos/seed/cloud-runner/600/600",
    category: "Running",
  },
  {
    id: "2",
    name: "Street Glide",
    slug: "street-glide",
    price: 99,
    image: "https://picsum.photos/seed/street-glide/600/600",
    category: "Lifestyle",
  },
  {
    id: "3",
    name: "Trail Blazer",
    slug: "trail-blazer",
    price: 149,
    image: "https://picsum.photos/seed/trail-blazer/600/600",
    category: "Running",
  },
  {
    id: "4",
    name: "Classic Low",
    slug: "classic-low",
    price: 89,
    image: "https://picsum.photos/seed/classic-low/600/600",
    category: "Lifestyle",
  },
];

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-navy)]">
        Shop
      </h1>
      <p className="mt-2 text-[var(--color-navy)]/70">
        {placeholderProducts.length} products
      </p>

      <div className="mt-8">
        <ProductGrid products={placeholderProducts} />
      </div>
    </div>
  );
}