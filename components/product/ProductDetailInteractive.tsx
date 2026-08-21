"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PlaceholderProductDetail } from "@/types";

export function ProductDetailInteractive({
  product,
}: {
  product: PlaceholderProductDetail;
}) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const canAddToCart = selectedSize && selectedColor;

  return (
    <div className="flex flex-col">
      {/* Brand + Category */}
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-navy)]/55">
        {product.brand} · {product.category}
      </p>

      {/* Product name */}
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--color-navy)] md:text-4xl">
        {product.name}
      </h1>

      {/* Price */}
      <p className="mt-4 text-2xl font-medium tracking-tight text-[var(--color-navy)]">
        ${product.price.toFixed(2)}
      </p>

      {/* Description */}
      <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[var(--color-navy)]/70">
        {product.description}
      </p>

      {/* Color selector */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--color-navy)]">Color</p>
          {selectedColor && (
            <span className="text-sm text-[var(--color-navy)]/60">
              {selectedColor}
            </span>
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

      {/* Size selector */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--color-navy)]">Size</p>
          {selectedSize && (
            <span className="text-sm text-[var(--color-navy)]/60">
              EU {selectedSize}
            </span>
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

      {/* Add to Cart */}
      <div className="mt-10 space-y-3">
        <Button
          className="w-full"
          size="lg"
          disabled={!canAddToCart}
        >
          {canAddToCart ? "Add to Cart" : "Select size & color"}
        </Button>

        <p className="text-center text-xs text-[var(--color-navy)]/50">
          Free shipping on orders over $150
        </p>
      </div>
    </div>
  );
}