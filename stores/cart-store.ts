import { create } from "zustand";
import { persist } from "zustand/middleware";

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

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
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
        } else {
          if (item.quantity > maxStock) {
            showStockToast(maxStock);
            if (maxStock > 0) {
              set({
                items: [...get().items, { ...item, quantity: maxStock, stock: maxStock }],
              });
              notifyCartUpdated();
            }
            return;
          }

          set({ items: [...get().items, { ...item, stock: maxStock }] });
        }
        notifyCartUpdated();
      },

      removeItem: (variantId) => {
        set({ items: get().items.filter((i) => i.variantId !== variantId) });
        notifyCartUpdated();
      },

      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(variantId);
          return;
        }

        const existing = get().items.find((i) => i.variantId === variantId);
        const maxStock = existing?.stock ?? 999;

        if (quantity > maxStock) {
          showStockToast(maxStock);
          set({
            items: get().items.map((i) =>
              i.variantId === variantId ? { ...i, quantity: maxStock } : i
            ),
          });
          notifyCartUpdated();
          return;
        }

        set({
          items: get().items.map((i) =>
            i.variantId === variantId ? { ...i, quantity } : i
          ),
        });
        notifyCartUpdated();
      },

      syncItemStock: (variantId, stock) => {
        set({
          items: get().items.map((i) =>
            i.variantId === variantId
              ? {
                  ...i,
                  stock,
                  quantity: Math.min(i.quantity, stock),
                }
              : i
          ),
        });
        notifyCartUpdated();
      },

      clearCart: () => {
        set({ items: [] });
        notifyCartUpdated();
      },

      isDrawerOpen: false,
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
    }),
    {
      name: "shoe-store-cart",
      partialize: (state) => ({ items: state.items }),
    }
  )
);