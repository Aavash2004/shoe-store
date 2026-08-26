"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart-store";
import { useSession } from "next-auth/react";


type Variant = {
  id: string;
  size: string;
  color: string;
  price: number;
  stock: number;
};

type ProductDetailData = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  category: string;
  brand: string;
  description: string;
  images: string[];
  sizes: string[];
  colors: string[];
  variants: Variant[];
};

export function ProductDetailInteractive({
  product,
}: {
  product: ProductDetailData;
}) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
const { status } = useSession();
const isLoggedIn = status === "authenticated";
  const canAddToCart = selectedSize && selectedColor;

  const matchedVariant = product.variants.find(
    (v) => v.size === selectedSize && v.color === selectedColor
  );

  async function handleAddToCart() {
  if (!matchedVariant) return;

  if (isLoggedIn) {
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId: matchedVariant.id, quantity: 1 }),
    });
  } else {
    addItem({
      variantId: matchedVariant.id,
      productId: product.id,
      productName: product.name,
      slug: product.slug,
      image: product.image,
      size: matchedVariant.size,
      color: matchedVariant.color,
      price: matchedVariant.price,
      quantity: 1,
    });
  }

  window.dispatchEvent(new Event("cart-updated"));
  window.dispatchEvent(new CustomEvent("show-toast",{detail:'added to cart'}));


  setAdded(true);
  setTimeout(() => setAdded(false), 1500);
}

  return (
    <div className="flex flex-col">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-navy)]/55">
        {product.brand} · {product.category}
      </p>

      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--color-navy)] md:text-4xl">
        {product.name}
      </h1>

      <p className="mt-4 text-2xl font-medium tracking-tight text-[var(--color-navy)]">
        ${product.price.toFixed(2)}
      </p>

      <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[var(--color-navy)]/70">
        {product.description}
      </p>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--color-navy)]">Color</p>
          {selectedColor && (
            <span className="text-sm text-[var(--color-navy)]/60">{selectedColor}</span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {product.colors.map((color) => {
            const isSelected = selectedColor === color;
            return (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`rounded-full border px-4 py-2 text-sm transition-all ${
                  isSelected
                    ? "border-[var(--color-accent)] bg-[var(--color-cream-alt)] text-[var(--color-navy)]"
                    : "border-[var(--color-sand)] text-[var(--color-navy)]/80 hover:border-[var(--color-navy)]/40"
                }`}
              >
                {color}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--color-navy)]">Size</p>
          {selectedSize && (
            <span className="text-sm text-[var(--color-navy)]/60">EU {selectedSize}</span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {product.sizes.map((size) => {
            const isSelected = selectedSize === size;
            return (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`flex h-11 w-11 items-center justify-center rounded-lg border text-sm font-medium transition-all ${
                  isSelected
                    ? "border-[var(--color-accent)] bg-[var(--color-cream-alt)] text-[var(--color-navy)]"
                    : "border-[var(--color-sand)] text-[var(--color-navy)]/80 hover:border-[var(--color-navy)]/40"
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-10 space-y-3">
        <Button
          className="w-full"
          size="lg"
          disabled={!canAddToCart}
          onClick={handleAddToCart}
        >
          {added ? "Added!" : canAddToCart ? "Add to Cart" : "Select size & color"}
        </Button>

        <p className="text-center text-xs text-[var(--color-navy)]/50">
          Free shipping on orders over $150
        </p>
      </div>
    </div>
  );
}