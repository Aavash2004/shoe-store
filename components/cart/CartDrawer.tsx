"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { Price } from "@/components/ui/Price";
import { Button } from "@/components/ui/button";
import { debounce, type DebouncedFunction } from "@/lib/utils/debounce";

type DbCartItem = {
  variant: {
    id: string;
    size: string;
    color: string;
    price: string | number;
    stock: number;
    product: {
      name: string;
      slug: string;
      images: { url: string }[];
    };
  };
  quantity: number;
};

export function CartDrawer() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  const isDrawerOpen = useCartStore((state) => state.isDrawerOpen);
  const closeDrawer = useCartStore((state) => state.closeDrawer);
  const localItems = useCartStore((state) => state.items);
  const localRemove = useCartStore((state) => state.removeItem);
  const localUpdate = useCartStore((state) => state.updateQuantity);

  const [dbItems, setDbItems] = useState<DbCartItem[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [alertAnnouncement, setAlertAnnouncement] = useState("");

  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Debounced sync for logged-in users
  const debouncedSyncMapRef = useRef<Map<string, DebouncedFunction<(quantity: number) => void>>>(
    new Map()
  );

  // Fetch db items on login, open, or when "cart-updated" is broadcast
  const fetchDbCart = () => {
    if (!isLoggedIn) return;
    setLoadingDb(true);
    fetch("/api/cart")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items) {
          setDbItems(data.items);
        }
      })
      .catch((err) => console.error("Failed to fetch cart:", err))
      .finally(() => setLoadingDb(false));
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchDbCart();
    }
  }, [isLoggedIn, isDrawerOpen]);

  useEffect(() => {
    const handleCartUpdated = () => {
      if (isLoggedIn) {
        fetchDbCart();
      }
    };
    window.addEventListener("cart-updated", handleCartUpdated);
    return () => window.removeEventListener("cart-updated", handleCartUpdated);
  }, [isLoggedIn]);

  // Unified items list
  const cartItems = useMemo(() => {
    if (isLoggedIn) {
      return dbItems.map((item) => ({
        variantId: item.variant.id,
        productName: item.variant.product.name,
        slug: item.variant.product.slug,
        image: item.variant.product.images?.[0]?.url || "/placeholder-shoe.png",
        size: item.variant.size,
        color: item.variant.color,
        price: Number(item.variant.price) || 0,
        quantity: item.quantity,
        stock: item.variant.stock ?? 999,
      }));
    }
    return localItems.map((item) => ({
      ...item,
      price: Number(item.price) || 0,
    }));
  }, [isLoggedIn, dbItems, localItems]);

  const totalCount = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.quantity, 0),
    [cartItems]
  );

  const subtotal = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [cartItems]
  );

  // Debounced API sync for server-side quantities
  function debouncedSyncQuantity(variantId: string, quantity: number) {
    let debouncedFn = debouncedSyncMapRef.current.get(variantId);
    if (!debouncedFn) {
      debouncedFn = debounce(async (qty: number) => {
        try {
          const res = await fetch("/api/cart", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ variantId, quantity: qty }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setAlertAnnouncement(data.error || "Could not update quantity");
            window.dispatchEvent(
              new CustomEvent("show-toast", {
                detail: data.error || "Could not update quantity",
              })
            );
            fetchDbCart();
          } else {
            window.dispatchEvent(new Event("cart-updated"));
          }
        } catch {
          setAlertAnnouncement("Network error updating cart");
        }
      }, 600);
      debouncedSyncMapRef.current.set(variantId, debouncedFn);
    }
    debouncedFn(quantity);
  }

  // Handle quantity changes
  const handleQuantityChange = (variantId: string, newQty: number, maxStock: number) => {
    if (newQty <= 0) {
      handleRemoveItem(variantId);
      return;
    }

    if (newQty > maxStock) {
      const msg = maxStock <= 0 ? "Out of stock" : `Only ${maxStock} left in stock`;
      setAlertAnnouncement(msg);
      window.dispatchEvent(new CustomEvent("show-toast", { detail: msg }));
      return;
    }

    if (isLoggedIn) {
      setDbItems((prev) =>
        prev.map((i) =>
          i.variant.id === variantId ? { ...i, quantity: newQty } : i
        )
      );
      debouncedSyncQuantity(variantId, newQty);
    } else {
      localUpdate(variantId, newQty);
    }
  };

  // Handle item removal
  const handleRemoveItem = async (variantId: string) => {
    const itemToRemove = cartItems.find((i) => i.variantId === variantId);
    if (itemToRemove) {
      setLiveAnnouncement(`Removed ${itemToRemove.productName} from your cart`);
    }

    // Always clear from local store
    localRemove(variantId);

    if (isLoggedIn) {
      const debouncedFn = debouncedSyncMapRef.current.get(variantId);
      if (debouncedFn) {
        debouncedFn.cancel();
        debouncedSyncMapRef.current.delete(variantId);
      }

      setDbItems((prev) => prev.filter((i) => i.variant.id !== variantId));
      try {
        const res = await fetch(`/api/cart?variantId=${encodeURIComponent(variantId)}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantId }),
        });
        if (!res.ok) {
          console.error("Failed to delete cart item on server");
          fetchDbCart();
        } else {
          window.dispatchEvent(new Event("cart-updated"));
        }
      } catch (err) {
        console.error("Failed to delete cart item:", err);
        fetchDbCart();
      }
    }
  };

  // Keyboard navigation & Focus management
  useEffect(() => {
    if (isDrawerOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = "hidden";

      // Focus close button on mount
      setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          closeDrawer();
          return;
        }

        // Focus trap
        if (e.key === "Tab" && drawerRef.current) {
          const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;

          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
        previousActiveElementRef.current?.focus();
      };
    }
  }, [isDrawerOpen, closeDrawer]);

  // Touch guard for backdrop click (prevent misfire if dragging/swiping)
  const isDraggingRef = useRef(false);

  return (
    <>
      {/* Off-screen Accessibility Live Regions */}
      <div role="status" aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>
      <div role="alert" aria-live="assertive" className="sr-only">
        {alertAnnouncement}
      </div>

      {/* Dimmed Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
          isDrawerOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
        onMouseDown={() => {
          isDraggingRef.current = false;
        }}
        onMouseMove={() => {
          isDraggingRef.current = true;
        }}
        onClick={() => {
          if (!isDraggingRef.current) {
            closeDrawer();
          }
        }}
      />

      {/* Slide-over Drawer Panel */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-heading"
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-[var(--color-sand)] bg-[var(--color-cream)] shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-[440px] sm:max-w-md ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
      >
        {/* ── 1. Top Header ── */}
        <div className="flex items-center justify-between border-b border-[var(--color-sand)]/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h2
              id="cart-drawer-heading"
              className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-[var(--color-navy)]"
            >
              Your Cart
            </h2>
            <span className="inline-flex h-5 items-center justify-center rounded-full bg-[var(--color-navy)] px-2 text-[11px] font-bold text-white">
              {totalCount}
            </span>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={closeDrawer}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-navy)]/60 transition hover:bg-[var(--color-sand)]/60 hover:text-[var(--color-navy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)]"
            aria-label="Close cart drawer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* ── 2. Scrollable Items Area ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 divide-y divide-[var(--color-sand)]/60">
          {cartItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-sand)]/40 text-[var(--color-navy)]/40 mb-4">
                <ShoppingBag className="h-8 w-8 stroke-[1.5]" />
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)]">
                Your cart is empty
              </h3>
              <p className="mt-1.5 max-w-xs text-xs text-[var(--color-navy)]/60 leading-relaxed">
                Explore our collection of handcrafted footwear and find your perfect fit.
              </p>
              <Button
                variant="outline"
                className="mt-6 rounded-md border-[var(--color-navy)] text-xs font-bold text-[var(--color-navy)] hover:bg-[var(--color-navy)] hover:text-white transition-colors"
                onClick={() => {
                  closeDrawer();
                  router.push("/shop");
                }}
              >
                Start Shopping
              </Button>
            </div>
          ) : (
            cartItems.map((item) => {
              const isOutOfStock = item.stock <= 0;
              const isAtMaxStock = item.quantity >= item.stock && !isOutOfStock;

              return (
                <div key={item.variantId} className="flex gap-3.5 py-4 first:pt-0 last:pb-0">
                  {/* Thumbnail */}
                  <Link
                    href={`/products/${item.slug}`}
                    onClick={closeDrawer}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-[var(--color-sand)] bg-white/70 shadow-2xs hover:opacity-90 transition-opacity"
                    aria-label={`View ${item.productName}`}
                  >
                    <Image
                      src={item.image}
                      alt={item.productName}
                      fill
                      className="object-cover object-center"
                      sizes="80px"
                    />
                  </Link>

                  {/* Details */}
                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/products/${item.slug}`}
                          onClick={closeDrawer}
                          className="font-[family-name:var(--font-display)] text-sm font-bold text-[var(--color-navy)] hover:underline truncate"
                        >
                          {item.productName}
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.variantId)}
                          className="text-[var(--color-navy)]/35 hover:text-rose-600 transition-colors p-1"
                          aria-label={`Remove ${item.productName} from cart`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Variant Specs */}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--color-navy)]/65">
                        <span className="rounded bg-[var(--color-sand)]/60 px-1.5 py-0.5 font-medium">
                          Size {item.size}
                        </span>
                        <span className="rounded bg-[var(--color-sand)]/60 px-1.5 py-0.5 font-medium">
                          {item.color}
                        </span>
                      </div>

                      {/* Out of stock or Max stock warnings */}
                      {isOutOfStock ? (
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-rose-600">
                          <AlertCircle className="h-3 w-3" />
                          <span>Sold out while in cart</span>
                        </div>
                      ) : isAtMaxStock ? (
                        <div className="mt-1 text-[10px] font-semibold text-amber-700">
                          Only {item.stock} available
                        </div>
                      ) : null}
                    </div>

                    {/* Price & Quantity Stepper */}
                    <div className="mt-2.5 flex items-center justify-between">
                      <Price
                        amount={item.price * item.quantity}
                        className="text-sm font-bold text-[var(--color-navy)]"
                      />

                      {/* Stepper */}
                      <div className="flex items-center rounded-md border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleQuantityChange(
                              item.variantId,
                              item.quantity - 1,
                              item.stock
                            )
                          }
                          className="flex h-6 w-6 items-center justify-center rounded-xs text-[var(--color-navy)]/70 hover:bg-[var(--color-sand)]/60 hover:text-[var(--color-navy)] transition disabled:opacity-30"
                          aria-label={`Decrease quantity of ${item.productName}`}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-semibold text-[var(--color-navy)]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={isAtMaxStock || isOutOfStock}
                          onClick={() =>
                            handleQuantityChange(
                              item.variantId,
                              item.quantity + 1,
                              item.stock
                            )
                          }
                          className="flex h-6 w-6 items-center justify-center rounded-xs text-[var(--color-navy)]/70 hover:bg-[var(--color-sand)]/60 hover:text-[var(--color-navy)] transition disabled:opacity-30 disabled:hover:bg-transparent"
                          aria-label={`Increase quantity of ${item.productName}`}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── 3. Sticky Footer with 3 Exit Actions ── */}
        {cartItems.length > 0 && (
          <div className="border-t border-[var(--color-sand)] bg-[var(--color-cream)] p-5 shadow-[0_-8px_20px_rgba(0,0,0,0.03)]">
            {/* Subtotal */}
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold text-[var(--color-navy)]/75">
                Subtotal
              </span>
              <Price
                amount={subtotal}
                className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--color-navy)]"
              />
            </div>
            <p className="mt-1 text-[11px] text-[var(--color-navy)]/55">
              Taxes and shipping calculated at checkout.
            </p>

            {/* CTAs */}
            <div className="mt-4 space-y-2.5">
              {/* Primary: Checkout */}
              <Button
                asChild
                className="w-full h-11 rounded-lg bg-[var(--color-navy)] text-white font-bold text-xs uppercase tracking-wider hover:bg-[var(--color-navy)]/90 shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <Link href="/checkout" onClick={closeDrawer}>
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              {/* Secondary: View Full Cart */}
              <Button
                asChild
                variant="outline"
                className="w-full h-10 rounded-lg border-[var(--color-sand)] bg-[var(--color-cream-alt)]/80 text-[var(--color-navy)] font-semibold text-xs hover:bg-[var(--color-sand)]/40 transition-colors"
              >
                <Link href="/cart" onClick={closeDrawer}>
                  View Full Cart ({totalCount})
                </Link>
              </Button>

              {/* Tertiary: Continue Shopping */}
              <button
                type="button"
                onClick={closeDrawer}
                className="w-full text-center text-[11px] font-semibold text-[var(--color-navy)]/60 hover:text-[var(--color-navy)] transition-colors py-1"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
