"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart-store";
import { useSession } from "next-auth/react";
import { gsap } from "@/lib/gsap";

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
  const containerRef = useRef<HTMLDivElement>(null);

  const addItem = useCartStore((state) => state.addItem);
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";
  const canAddToCart = selectedSize && selectedColor;

  const matchedVariant = product.variants.find(
    (v) => v.size === selectedSize && v.color === selectedColor
  );

  // Staggered entrance animation for product info details
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect prefers-reduced-motion
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        Array.from(container.children),
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.05,
          delay: 0.15,
          ease: "power2.out",
        }
      );
    }, container);

    return () => ctx.revert();
  }, []);

  async function handleAddToCart() {
    if (!matchedVariant) return;

    if (matchedVariant.stock <= 0) {
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: "Out of stock" })
      );
      return;
    }
    if (!isLoggedIn) {
      const existing = useCartStore.getState().items.find(
        (i) => i.variantId === matchedVariant.id
      );
      const currentQty = existing?.quantity ?? 0;
      if (currentQty + 1 > matchedVariant.stock) {
        window.dispatchEvent(
          new CustomEvent("show-toast", { detail: `Only ${matchedVariant.stock} left in stock` })
        );
        return;
      }
    }

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
    window.dispatchEvent(new CustomEvent("show-toast", { detail: "added to cart" }));

    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div ref={containerRef} className="flex flex-col">
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

      {/* Stock status indicator */}
      {selectedSize && selectedColor && matchedVariant && (
        <div className="mt-6">
          {matchedVariant.stock <= 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1 rounded-md border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Out of Stock
            </span>
          ) : matchedVariant.stock <= 5 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              ⚡ Only {matchedVariant.stock} left in stock - order soon!
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              In Stock ({matchedVariant.stock} pairs available)
            </span>
          )}
        </div>
      )}

      <div className="mt-8 space-y-3">
        <Button
          className="w-full"
          size="lg"
          disabled={!canAddToCart || (matchedVariant?.stock ?? 0) <= 0}
          onClick={handleAddToCart}
        >
          {added
            ? "Added!"
            : !canAddToCart
              ? "Select size & color"
              : (matchedVariant?.stock ?? 0) <= 0
                ? "Out of Stock"
                : "Add to Cart"}
        </Button>

        <p className="text-center text-xs text-[var(--color-navy)]/50">
          Free shipping on orders over $150
        </p>
      </div>
    </div>
  );
}