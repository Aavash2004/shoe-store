"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";

interface WishlistProduct {
  id: string;
  productId: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  image: string;
  stock: number;
  variants?: { id: string; size: string; color: string; stock: number; price: any }[];
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const addItemToCart = useCartStore((state) => state.addItem);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/me/wishlist");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load wishlist:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (itemId: string, productId: string) => {
    // Optimistic UI update
    setItems((prev) => prev.filter((item) => item.id !== itemId && item.productId !== productId));

    try {
      await fetch(`/api/me/wishlist/${productId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to remove item from wishlist:", err);
      fetchWishlist();
    }
  };

  const handleAddToCart = (product: WishlistProduct) => {
    const firstVariant = product.variants?.[0];
    addItemToCart({
      variantId: firstVariant?.id || product.productId,
      productId: product.productId,
      productName: product.name,
      slug: product.slug,
      price: product.price,
      image: product.image,
      size: firstVariant?.size || "40",
      color: firstVariant?.color || "Default",
      quantity: 1,
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)]">
          YOUR WISHLIST
        </h1>
        <p className="text-sm text-[var(--color-navy)]/60 mt-1 italic">
          "Pieces you're thinking about."
        </p>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-80 bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-navy)]">
              Nothing saved yet.
            </h3>
            <p className="text-xs text-[var(--color-navy)]/60 max-w-sm mx-auto">
              Save your favorite sneakers and footwear styles to review them anytime.
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-navy)] text-[var(--color-cream)] rounded-xl text-xs font-semibold hover:bg-[var(--color-navy)]/90 transition-colors shadow-xs"
          >
            <span>EXPLORE SHOES</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="group bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              {/* Top Image Box */}
              <div className="relative aspect-square w-full overflow-hidden bg-stone-900">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Remove button */}
                <button
                  onClick={() => handleRemove(item.id, item.productId)}
                  className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full text-[var(--color-navy)] hover:text-rose-600 hover:bg-white transition-colors"
                  aria-label="Remove from wishlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Info & Actions */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/60">
                    {item.brand} · {item.category}
                  </p>
                  <Link
                    href={`/products/${item.slug}`}
                    className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)] hover:text-[var(--color-sky)] transition-colors block mt-1"
                  >
                    {item.name}
                  </Link>
                  <p className="text-sm font-semibold text-[var(--color-navy)] mt-2">
                    ${item.price.toFixed(2)}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--color-sand)]/60 flex items-center gap-2">
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="flex-1 py-2.5 px-4 bg-[var(--color-navy)] hover:bg-[var(--color-navy)]/90 text-[var(--color-cream)] text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>ADD TO CART</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
