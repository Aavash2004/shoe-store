import { useState, useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getImagesForColor } from "@/lib/utils/gallery";
import { debounce, type DebouncedFunction } from "@/lib/utils/debounce";

export type CartItem = {
  variantId: string;
  productId: string;
  productName: string;
  slug: string;
  image: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
  stock: number;
};

type CartState = {
  items: CartItem[];
  hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
  isFetching: boolean;
  setIsFetching: (val: boolean) => void;
  setItems: (items: CartItem[]) => void;
  fetchCart: () => Promise<void>;
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  syncItemStock: (variantId: string, stock: number) => void;
  clearCart: () => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

const notifyCartUpdated = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cart-updated"));
  }
};

const showStockToast = (stock: number) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: stock <= 0 ? "Out of stock" : `Only ${stock} left in stock`,
      })
    );
  }
};

const debouncedSyncMap = new Map<string, DebouncedFunction<(quantity: number) => void>>();

function syncQuantityToServer(variantId: string, quantity: number) {
  if (typeof window === "undefined") return;
  let debounced = debouncedSyncMap.get(variantId);
  if (!debounced) {
    debounced = debounce(async (qty: number) => {
      try {
        const res = await fetch("/api/cart", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantId, quantity: qty }),
        });
        if (!res.ok && res.status !== 401) {
          const data = await res.json().catch(() => ({}));
          if (data.error) {
            window.dispatchEvent(
              new CustomEvent("show-toast", { detail: data.error })
            );
          }
          useCartStore.getState().fetchCart();
        }
      } catch {}
    }, 400);
    debouncedSyncMap.set(variantId, debounced);
  }
  debounced(quantity);
}

function syncRemoveToServer(variantId: string) {
  if (typeof window === "undefined") return;
  const debounced = debouncedSyncMap.get(variantId);
  if (debounced) {
    debounced.cancel();
    debouncedSyncMap.delete(variantId);
  }
  fetch(`/api/cart?variantId=${encodeURIComponent(variantId)}`, {
    method: "DELETE",
  }).catch(() => {});
}

function syncAddToServer(variantId: string, quantity: number) {
  if (typeof window === "undefined") return;
  fetch("/api/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ variantId, quantity }),
  }).catch(() => {});
}

function syncClearToServer() {
  if (typeof window === "undefined") return;
  debouncedSyncMap.forEach((debounced) => debounced.cancel());
  debouncedSyncMap.clear();
  fetch("/api/cart?clear=true", {
    method: "DELETE",
  }).catch(() => {});
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      hasHydrated: false,
      setHasHydrated: (val) => set({ hasHydrated: val }),
      isFetching: false,
      setIsFetching: (val) => set({ isFetching: val }),
      setItems: (items) => {
        set({ items });
        notifyCartUpdated();
      },
      fetchCart: async () => {
        try {
          set({ isFetching: true });
          const res = await fetch("/api/cart");
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.items)) {
              const mapped: CartItem[] = data.items.map((i: any) => ({
                variantId: i.variant?.id ?? i.variantId,
                productId: i.variant?.product?.id ?? i.productId,
                productName: i.variant?.product?.name ?? i.productName,
                slug: i.variant?.product?.slug ?? i.slug ?? "",
                image:
                  (i.variant?.product?.images && i.variant?.color
                    ? getImagesForColor(i.variant.product.images, i.variant.color)[0]?.url
                    : i.variant?.product?.images?.[0]?.url) ||
                  i.image ||
                  "/images/Shoes/s05.avif",
                size: i.variant?.size ?? i.size ?? "",
                color: i.variant?.color ?? i.color ?? "",
                price: Number(i.variant?.price ?? i.price ?? 0),
                quantity: Math.max(1, i.quantity),
                stock: i.variant?.stock ?? i.stock ?? 999,
              }));
              set({ items: mapped });
            }
          }
        } catch {
        } finally {
          set({ isFetching: false });
        }
      },
      addItem: (item) => {
        const existing = get().items.find((i) => i.variantId === item.variantId);
        const maxStock = typeof item.stock === "number" ? item.stock : (existing?.stock ?? 999);

        if (existing) {
          const currentQty = existing.quantity;
          const targetQty = currentQty + item.quantity;

          if (targetQty > maxStock) {
            showStockToast(maxStock);
            // Cap to maxStock if current is less, otherwise leave at current
            if (currentQty < maxStock) {
              set({
                items: get().items.map((i) =>
                  i.variantId === item.variantId
                    ? { ...i, quantity: maxStock, stock: maxStock }
                    : i
                ),
              });
              notifyCartUpdated();
              syncQuantityToServer(item.variantId, maxStock);
            }
            return;
          }

          set({
            items: get().items.map((i) =>
              i.variantId === item.variantId
                ? { ...i, quantity: targetQty, stock: maxStock }
                : i
            ),
          });
          notifyCartUpdated();
          syncQuantityToServer(item.variantId, targetQty);
        } else {
          if (item.quantity > maxStock) {
            showStockToast(maxStock);
            if (maxStock > 0) {
              set({
                items: [...get().items, { ...item, quantity: maxStock, stock: maxStock }],
              });
              notifyCartUpdated();
              syncAddToServer(item.variantId, maxStock);
            }
            return;
          }

          set({ items: [...get().items, { ...item, stock: maxStock }] });
          notifyCartUpdated();
          syncAddToServer(item.variantId, item.quantity);
        }
      },

      removeItem: (variantId) => {
        set({ items: get().items.filter((i) => i.variantId !== variantId) });
        notifyCartUpdated();
        syncRemoveToServer(variantId);
      },

      updateQuantity: (variantId, quantity) => {
        // Enforce strict minimum-1 quantity rule in state logic
        const targetQuantity = Math.max(1, quantity);

        const existing = get().items.find((i) => i.variantId === variantId);
        if (!existing) return;

        const maxStock = existing?.stock ?? 999;

        if (targetQuantity > maxStock) {
          showStockToast(maxStock);
          set({
            items: get().items.map((i) =>
              i.variantId === variantId ? { ...i, quantity: maxStock } : i
            ),
          });
          notifyCartUpdated();
          syncQuantityToServer(variantId, maxStock);
          return;
        }

        set({
          items: get().items.map((i) =>
            i.variantId === variantId ? { ...i, quantity: targetQuantity } : i
          ),
        });
        notifyCartUpdated();
        syncQuantityToServer(variantId, targetQuantity);
      },

      syncItemStock: (variantId, stock) => {
        set({
          items: get().items.map((i) =>
            i.variantId === variantId
              ? {
                  ...i,
                  stock,
                  quantity: Math.min(Math.max(1, i.quantity), stock),
                }
              : i
          ),
        });
        notifyCartUpdated();
      },

      clearCart: () => {
        set({ items: [] });
        notifyCartUpdated();
        syncClearToServer();
      },

      isDrawerOpen: false,
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
    }),
    {
      name: "shoe-store-cart",
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function useCartHydrated() {
  return useCartStore((state) => state.hasHydrated);
}

export function useCartLoading(isLoggedIn: boolean = false) {
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const isFetching = useCartStore((state) => state.isFetching);
  return !hasHydrated || (isLoggedIn && isFetching);
}