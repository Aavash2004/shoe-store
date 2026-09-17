"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart-store";
import { useSession } from "next-auth/react";
import { gsap } from "@/lib/gsap";
import { WishlistButton } from "@/components/product/WishlistButton";
import { Ruler } from "lucide-react";
import { SizeFitGuideModal } from "@/components/product/SizeFitGuideModal";
import {
  SizeSystem,
  getDualDisplaySize,
} from "@/lib/constants/sizing";
import { Price } from "@/components/ui/Price";
import { CurrencySwitcher } from "@/components/layout/CurrencySwitcher";

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
  gender?: string;
  variants: Variant[];
};

export function ProductDetailInteractive({
  product,
}: {
  product: ProductDetailData;
}) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [sizeSystem, setSizeSystem] = useState<SizeSystem>("US_MEN");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (isSubmitting || !matchedVariant) return;

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

    setIsSubmitting(true);
    try {
      if (isLoggedIn) {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantId: matchedVariant.id, quantity: 1 }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          window.dispatchEvent(
            new CustomEvent("show-toast", {
              detail:
                data.error ||
                (matchedVariant.stock <= 0
                  ? "Out of stock"
                  : `Only ${matchedVariant.stock} left in stock`),
            })
          );
          return;
        }
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
          stock: matchedVariant.stock,
        });
      }

      window.dispatchEvent(new Event("cart-updated"));
      window.dispatchEvent(new CustomEvent("show-toast", { detail: "Added to cart" }));

      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div ref={containerRef} className="flex flex-col">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-navy)]/55">
        {product.brand} · {product.category}
      </p>

      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--color-navy)] md:text-4xl">
        {product.name}
      </h1>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <Price
            amount={matchedVariant ? matchedVariant.price : product.price}
            className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-navy)]"
          />
        </div>
        <div className="flex items-center gap-1.5" data-testid="product-pricing-currency-switcher">
          <span className="text-xs font-semibold text-[var(--color-navy)]/60">Currency:</span>
          <CurrencySwitcher variant="dropdown" />
        </div>
      </div>

      <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[var(--color-navy)]/70">
        {product.description}
      </p>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--color-navy)]">Color</p>
          {selectedColor && (
            <span className="text-sm text-[var(--color-navy)]"></span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {product.colors.map((color) => {
            const isSelected = selectedColor === color;
            return (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`rounded-full border px-4 py-2 text-sm transition-all ${isSelected
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[var(--color-navy)]">Select Size</span>
            {/* Region system selector */}
            <div className="inline-flex items-center rounded-lg border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-0.5 text-[11px] font-bold">
              {(
                [
                  { id: "US_MEN", label: "US" },
                  { id: "UK", label: "UK" },
                  { id: "EU", label: "EU" },
                  { id: "CM", label: "CM" },
                ] as const
              ).map((sys) => (
                <button
                  key={sys.id}
                  type="button"
                  onClick={() => setSizeSystem(sys.id)}
                  className={`rounded-md px-2 py-0.5 transition-all ${
                    sizeSystem === sys.id
                      ? "bg-[var(--color-navy)] text-[var(--color-cream)] shadow-2xs"
                      : "text-[var(--color-navy)]/60 hover:text-[var(--color-navy)]"
                  }`}
                >
                  {sys.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size & Fit Guide Trigger */}
          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-navy)]/70 hover:text-[var(--color-navy)] transition-colors underline-offset-4 hover:underline"
          >
            <Ruler className="h-3.5 w-3.5 text-[var(--color-navy)]/80" />
            <span>Size & Fit Guide</span>
          </button>
        </div>

        {/* Dual-Label Size Pills Grid */}
        <div className="mt-3.5 grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {product.sizes.map((size) => {
            const isSelected = selectedSize === size;
            const dual = getDualDisplaySize(size, sizeSystem, product.gender);

            return (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={`relative flex flex-col items-center justify-center rounded-xl border py-2.5 px-2 text-center transition-all ${
                  isSelected
                    ? "border-[var(--color-navy)] bg-[var(--color-cream-alt)] shadow-xs ring-1 ring-[var(--color-navy)]"
                    : "border-[var(--color-sand)] bg-white/70 hover:border-[var(--color-navy)]/40 hover:bg-white"
                }`}
              >
                <span
                  className={`text-sm font-bold tracking-tight ${
                    isSelected ? "text-[var(--color-navy)]" : "text-[var(--color-navy)]/90"
                  }`}
                >
                  {dual.primary}
                </span>
                <span className="mt-0.5 text-[10px] font-semibold text-[var(--color-navy)]/55 truncate max-w-full">
                  {dual.secondary}
                </span>
                {dual.isApproximate && (
                  <span className="text-[8px] uppercase tracking-wider text-amber-700 font-bold mt-0.5">
                    approx.
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Size Cross-System Breakdown Strip */}
        {selectedSize && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]/60 px-3.5 py-2 text-xs text-[var(--color-navy)]/75">
            <span className="font-bold text-[var(--color-navy)]">
              All Equivalents:
            </span>
            {(() => {
              const d = getDualDisplaySize(selectedSize, sizeSystem, product.gender);
              const isWomen = product.gender?.toUpperCase().includes("WOMEN");
              return (
                <span className="font-mono font-semibold text-[11px] text-[var(--color-navy)]/90">
                  US {isWomen ? d.conversions.usWomen : d.conversions.usMen} · UK {d.conversions.uk} · EU {d.conversions.eu} · {d.conversions.cm} cm
                </span>
              );
            })()}
          </div>
        )}
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
        <div className="flex items-center gap-3">
          <Button
            className="flex-1 h-12 text-sm font-bold"
            size="lg"
            disabled={isSubmitting || !canAddToCart || (matchedVariant?.stock ?? 0) <= 0}
            onClick={handleAddToCart}
          >
            {isSubmitting
              ? "Adding..."
              : added
                ? "Added!"
                : !canAddToCart
                  ? "Select size & color"
                  : (matchedVariant?.stock ?? 0) <= 0
                    ? "Out of Stock"
                    : "Add to Cart"}
          </Button>
          <div className="shrink-0">
            <WishlistButton
              productId={product.id}
              iconSize={20}
              className="h-12 w-12 rounded-xl border border-[var(--color-sand)] hover:border-[var(--color-navy)]/40 bg-white shadow-2xs"
            />
          </div>
        </div>

        <p className="text-center text-xs text-[var(--color-navy)]/50">
          Free shipping on orders over $150
        </p>
      </div>

      {/* Size & Fit Guide Accessible Modal */}
      <SizeFitGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        selectedSize={selectedSize}
        gender={product.gender}
      />
    </div>
  );
}