"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";
import { CouponInput, AppliedCoupon } from "@/components/cart/CouponInput";

type DbCartItem = {
  variant: {
    id: string;
    size: string;
    color: string;
    price: string;
    stock: number;
    product: {
      name: string;
      slug: string;
      images: { url: string }[];
    };
  };
  quantity: number;
};

export default function CartPage() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  const localItems = useCartStore((state) => state.items);
  const localRemove = useCartStore((state) => state.removeItem);
  const localUpdate = useCartStore((state) => state.updateQuantity);

  const [dbItems, setDbItems] = useState<DbCartItem[]>([]);
  const [loading, setLoading] = useState(isLoggedIn);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    fetch("/api/cart")
      .then((res) => res.json())
      .then((data) => setDbItems(data.items ?? []))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  async function handleDbUpdate(variantId: string, quantity: number) {
    const item = dbItems.find((i) => i.variant.id === variantId);
    if (item && quantity > item.variant.stock) {
      window.dispatchEvent(
        new CustomEvent("show-toast", { detail: `Only ${item.variant.stock} left in stock` })
      );
      return;
    }

    await fetch("/api/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId, quantity }),
    });
    setDbItems((prev) =>
      quantity === 0
        ? prev.filter((i) => i.variant.id !== variantId)
        : prev.map((i) => (i.variant.id === variantId ? { ...i, quantity } : i))
    );
  }

  async function handleDbRemove(variantId: string) {
    await fetch(`/api/cart?variantId=${variantId}`, { method: "DELETE" });
    setDbItems((prev) => prev.filter((i) => i.variant.id !== variantId));
  }

  if (status === "loading" || loading) {
    return <div className="mx-auto max-w-4xl px-6 py-24 text-center text-navy/60">Loading cart...</div>;
  }

  const items = isLoggedIn
    ? dbItems.map((i) => ({
        variantId: i.variant.id,
        productName: i.variant.product.name,
        slug: i.variant.product.slug,
        image: i.variant.product.images[0]?.url ?? "",
        size: i.variant.size,
        color: i.variant.color,
        price: Number(i.variant.price),
        quantity: i.quantity,
      }))
    : localItems;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = appliedCoupon ? Math.min(appliedCoupon.discountAmount, subtotal) : 0;
  const finalTotal = Math.max(0, subtotal - discount);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-navy">
          Your cart is empty
        </h1>
        <p className="mt-2 text-navy/70">Looks like you haven&apos;t added anything yet.</p>
        <Button className="mt-6" asChild>
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)]">
        Your Cart
      </h1>

      <div className="mt-8 flex flex-col gap-4">
        {items.map((item) => (
          <div
            key={item.variantId}
            className="flex items-center gap-4 border-b border-[var(--color-sand)] pb-4"
          >
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--color-cream-alt)] border border-[var(--color-sand)]">
              {item.image && (
                <Image src={item.image} alt={item.productName} fill className="object-cover" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <Link href={`/products/${item.slug}`} className="font-semibold text-sm text-[var(--color-navy)] truncate block">
                {item.productName}
              </Link>
              <p className="mt-0.5 text-xs text-[var(--color-navy)]/60">
                {item.color} · Size {item.size}
              </p>
              <p className="mt-1 text-xs font-bold text-[var(--color-navy)]">${item.price.toFixed(2)}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  isLoggedIn
                    ? handleDbUpdate(item.variantId, item.quantity - 1)
                    : localUpdate(item.variantId, item.quantity - 1)
                }
                className="h-7 w-7 rounded-lg border border-[var(--color-sand)] text-xs text-[var(--color-navy)] hover:bg-[var(--color-sand)]/30"
              >
                −
              </button>
              <span className="w-5 text-center text-xs font-bold text-[var(--color-navy)]">{item.quantity}</span>
              <button
                onClick={() =>
                  isLoggedIn
                    ? handleDbUpdate(item.variantId, item.quantity + 1)
                    : localUpdate(item.variantId, item.quantity + 1)
                }
                className="h-7 w-7 rounded-lg border border-[var(--color-sand)] text-xs text-[var(--color-navy)] hover:bg-[var(--color-sand)]/30"
              >
                +
              </button>
            </div>

            <button
              onClick={() =>
                isLoggedIn ? handleDbRemove(item.variantId) : localRemove(item.variantId)
              }
              className="text-xs text-[var(--color-navy)]/50 hover:text-rose-600 transition-colors ml-2"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Cart Summary & Promo Code Coupon Box */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start border-t border-[var(--color-sand)] pt-6">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/60">
            Have a Promo Code?
          </p>
          <CouponInput
            subtotal={subtotal}
            appliedCoupon={appliedCoupon}
            onApplyCoupon={setAppliedCoupon}
          />
        </div>

        <div className="space-y-3 rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-6 text-xs">
          <div className="flex justify-between text-[var(--color-navy)]/70">
            <span>Subtotal</span>
            <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>

          {appliedCoupon && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Promo Discount ({appliedCoupon.code})</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between border-t border-[var(--color-sand)] pt-3 text-base font-bold text-[var(--color-navy)]">
            <span>Estimated Total</span>
            <span>${finalTotal.toFixed(2)}</span>
          </div>

          <Button size="lg" className="w-full mt-3 rounded-xl h-11 bg-[var(--color-navy)] text-[var(--color-cream)] hover:bg-[var(--color-navy)]/90 font-semibold" asChild>
            <Link href="/checkout">Proceed to Checkout</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}