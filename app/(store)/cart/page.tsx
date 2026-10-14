"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";
import { CouponInput, AppliedCoupon } from "@/components/cart/CouponInput";
import { Price } from "@/components/ui/Price";
import { getSafeImageUrl } from "@/lib/utils";
import { StoreContainer } from "@/components/layout/PageContainer";

export default function CartPage() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const hasFetchedInitial = useCartStore((state) => state.hasFetchedInitial);

  const [mounted, setMounted] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isLoggedIn && !hasFetchedInitial) {
      fetchCart();
    }
  }, [isLoggedIn, hasFetchedInitial, fetchCart]);

  function handleQuantityChange(variantId: string, newQty: number, maxStock: number) {
    if (newQty < 1) return;

    if (newQty > maxStock) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: maxStock <= 0 ? "Out of stock" : `Only ${maxStock} left in stock`,
        })
      );
      return;
    }

    updateQuantity(variantId, newQty);
  }

  const isCartLoading =
    !mounted ||
    status === "loading" ||
    !hasHydrated ||
    (isLoggedIn && !hasFetchedInitial && items.length === 0);

  if (isCartLoading) {
    return (
      <StoreContainer className="py-12 animate-pulse">
        <div className="h-8 w-44 rounded-lg bg-[var(--color-sand)]" />
        <div className="mt-8 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-[var(--color-sand)] pb-4">
              <div className="h-20 w-20 rounded-md bg-[var(--color-sand)]/50 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded bg-[var(--color-sand)]" />
                <div className="h-3 w-32 rounded bg-[var(--color-sand)]/60" />
                <div className="h-4 w-20 rounded bg-[var(--color-sand)]/70" />
              </div>
              <div className="h-7 w-24 rounded-md bg-[var(--color-sand)]/40" />
              <div className="h-4 w-14 rounded bg-[var(--color-sand)]/40 ml-2" />
            </div>
          ))}
        </div>
      </StoreContainer>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = appliedCoupon ? Math.min(appliedCoupon.discountAmount, subtotal) : 0;
  const finalTotal = Math.max(0, subtotal - discount);

  if (items.length === 0) {
    return (
      <StoreContainer className="py-24 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-navy">
          Your cart is empty
        </h1>
        <p className="mt-2 text-navy/70">Looks like you haven&apos;t added anything yet.</p>
        <Button className="mt-6" asChild>
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </StoreContainer>
    );
  }

  return (
    <StoreContainer className="py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)]">
        Your Cart
      </h1>

      <div className="mt-8 flex flex-col gap-4">
        {items.map((item) => (
          <div
            key={item.variantId}
            className="flex items-center gap-4 border-b border-[var(--color-sand)] pb-4"
          >
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-[var(--color-cream-alt)] border border-[var(--color-sand)]">
              <Image
                src={getSafeImageUrl(item.image)}
                alt={item.productName}
                fill
                className="object-cover"
              />
            </div>

            <div className="flex-1 min-w-0">
              <Link href={`/products/${item.slug}`} className="font-semibold text-sm text-[var(--color-navy)] truncate block">
                {item.productName}
              </Link>
              <p className="mt-0.5 text-xs text-[var(--color-navy)]/60">
                {item.color} · Size {item.size}
              </p>
              <p className="mt-1 text-xs font-bold text-[var(--color-navy)]"><Price amount={item.price} /></p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={item.quantity <= 1}
                aria-disabled={item.quantity <= 1}
                onClick={() =>
                  handleQuantityChange(item.variantId, item.quantity - 1, item.stock)
                }
                className={`h-7 w-7 rounded-md border border-[var(--color-sand)] text-xs text-[var(--color-navy)] transition-all ${
                  item.quantity <= 1
                    ? "opacity-30 cursor-not-allowed bg-black/5 hover:bg-black/5 pointer-events-none"
                    : "hover:bg-[var(--color-sand)]/30 cursor-pointer"
                }`}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-6 text-center text-xs font-bold text-[var(--color-navy)]">{item.quantity}</span>
              <button
                type="button"
                onClick={() => {
                  if (item.quantity >= item.stock) {
                    window.dispatchEvent(
                      new CustomEvent("show-toast", {
                        detail:
                          item.stock <= 0
                            ? "Out of stock"
                            : `Only ${item.stock} left in stock`,
                      })
                    );
                    return;
                  }
                  handleQuantityChange(item.variantId, item.quantity + 1, item.stock);
                }}
                className={`h-7 w-7 rounded-lg border border-[var(--color-sand)] text-xs text-[var(--color-navy)] transition-colors ${
                  item.quantity >= item.stock
                    ? "opacity-40 cursor-not-allowed hover:bg-rose-50"
                    : "hover:bg-[var(--color-sand)]/30"
                }`}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={() => removeItem(item.variantId)}
              className="text-xs text-[var(--color-navy)]/50 hover:text-rose-600 transition-colors ml-2 cursor-pointer"
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
            <span className="font-semibold"><Price amount={subtotal} /></span>
          </div>

          {appliedCoupon && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Promo Discount ({appliedCoupon.code})</span>
              <span>-<Price amount={discount} /></span>
            </div>
          )}

          <div className="flex justify-between border-t border-[var(--color-sand)] pt-3 text-base font-bold text-[var(--color-navy)]">
            <span>Estimated Total</span>
            <span><Price amount={finalTotal} /></span>
          </div>

          <Button size="lg" className="w-full mt-3 rounded-xl h-11 bg-[var(--color-navy)] text-[var(--color-cream)] hover:bg-[var(--color-navy)]/90 font-semibold" asChild>
            <Link href="/checkout">Proceed to Checkout</Link>
          </Button>
        </div>
      </div>
    </StoreContainer>
  );
}