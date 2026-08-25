"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";

type DbCartItem = {
  variant: {
    id: string;
    size: string;
    color: string;
    price: string;
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

  useEffect(() => {
    if (!isLoggedIn) return;

    fetch("/api/cart")
      .then((res) => res.json())
      .then((data) => setDbItems(data.items ?? []))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  async function handleDbUpdate(variantId: string, quantity: number) {
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
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-navy">Your Cart</h1>

      <div className="mt-8 flex flex-col gap-4">
        {items.map((item) => (
          <div
            key={item.variantId}
            className="flex items-center gap-4 border-b border-sand pb-4"
          >
            <div className="relative h-24 w-24 overflow-hidden rounded-md bg-sand">
              {item.image && (
                <Image src={item.image} alt={item.productName} fill className="object-cover" />
              )}
            </div>

            <div className="flex-1">
              <Link href={`/products/${item.slug}`} className="font-medium text-navy">
                {item.productName}
              </Link>
              <p className="mt-1 text-sm text-navy/60">
                {item.color} · Size {item.size}
              </p>
              <p className="mt-1 text-sm font-medium text-navy">${item.price.toFixed(2)}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  isLoggedIn
                    ? handleDbUpdate(item.variantId, item.quantity - 1)
                    : localUpdate(item.variantId, item.quantity - 1)
                }
                className="h-8 w-8 rounded-md border border-sand text-navy"
              >
                −
              </button>
              <span className="w-6 text-center text-sm text-navy">{item.quantity}</span>
              <button
                onClick={() =>
                  isLoggedIn
                    ? handleDbUpdate(item.variantId, item.quantity + 1)
                    : localUpdate(item.variantId, item.quantity + 1)
                }
                className="h-8 w-8 rounded-md border border-sand text-navy"
              >
                +
              </button>
            </div>

            <button
              onClick={() =>
                isLoggedIn ? handleDbRemove(item.variantId) : localRemove(item.variantId)
              }
              className="text-sm text-navy/50 hover:text-navy"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-sand pt-6">
        <p className="text-lg font-medium text-navy">Subtotal: ${subtotal.toFixed(2)}</p>
        <Button size="lg" asChild>
          <Link href="/checkout">Checkout</Link>
        </Button>
      </div>
    </div>
  );
}