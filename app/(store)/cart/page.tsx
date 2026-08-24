"use client";

import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore();

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-navy)]">
          Your cart is empty
        </h1>
        <p className="mt-2 text-[var(--color-navy)]/70">
          Looks like you haven't added anything yet.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-navy)]">
        Your Cart
      </h1>

      <div className="mt-8 flex flex-col gap-4">
        {items.map((item) => (
          <div
            key={item.variantId}
            className="flex items-center gap-4 border-b border-[var(--color-sand)] pb-4"
          >
            <div className="relative h-24 w-24 overflow-hidden rounded-md bg-[var(--color-sand)]">
              {item.image && (
                <Image src={item.image} alt={item.productName} fill className="object-cover" />
              )}
            </div>

            <div className="flex-1">
              <Link href={`/products/${item.slug}`} className="font-medium text-[var(--color-navy)]">
                {item.productName}
              </Link>
              <p className="mt-1 text-sm text-[var(--color-navy)]/60">
                {item.color} · Size {item.size}
              </p>
              <p className="mt-1 text-sm font-medium text-[var(--color-navy)]">
                ${item.price.toFixed(2)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                className="h-8 w-8 rounded-md border border-[var(--color-sand)] text-[var(--color-navy)]"
              >
                −
              </button>
              <span className="w-6 text-center text-sm text-[var(--color-navy)]">
                {item.quantity}
              </span>
              <button
                onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                className="h-8 w-8 rounded-md border border-[var(--color-sand)] text-[var(--color-navy)]"
              >
                +
              </button>
            </div>

            <button
              onClick={() => removeItem(item.variantId)}
              className="text-sm text-[var(--color-navy)]/50 hover:text-[var(--color-navy)]"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-[var(--color-sand)] pt-6">
        <p className="text-lg font-medium text-[var(--color-navy)]">
          Subtotal: ${subtotal.toFixed(2)}
        </p>
        <Button size="lg" asChild>
          <Link href="/checkout">Checkout</Link>
        </Button>
      </div>
    </div>
  );
}