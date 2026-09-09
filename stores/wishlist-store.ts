import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistState {
  wishlistIds: string[];
  hasFetched: boolean;
  setWishlistIds: (ids: string[]) => void;
  toggleWishlistId: (productId: string) => boolean;
  removeItem: (productId: string) => void;
  clearWishlist: () => void;
  isWishlisted: (productId: string) => boolean;
  fetchWishlist: () => Promise<void>;
}

const notifyWishlistUpdated = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("wishlist-updated"));
  }
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      wishlistIds: [],
      hasFetched: false,

      setWishlistIds: (ids) => {
        set({ wishlistIds: ids, hasFetched: true });
        notifyWishlistUpdated();
      },

      toggleWishlistId: (productId) => {
        const current = get().wishlistIds;
        const exists = current.includes(productId);
        const next = exists
          ? current.filter((id) => id !== productId)
          : [...current, productId];

        set({ wishlistIds: next });
        notifyWishlistUpdated();
        return !exists;
      },

      removeItem: (productId) => {
        set({ wishlistIds: get().wishlistIds.filter((id) => id !== productId) });
        notifyWishlistUpdated();
      },

      clearWishlist: () => {
        set({ wishlistIds: [], hasFetched: false });
        notifyWishlistUpdated();
      },

      isWishlisted: (productId) => get().wishlistIds.includes(productId),

      fetchWishlist: async () => {
        try {
          const res = await fetch("/api/me/wishlist");
          if (res.ok) {
            const data = await res.json();
            const ids = (data.items || [])
              .map((item: any) => item.productId)
              .filter(Boolean);
            set({ wishlistIds: ids, hasFetched: true });
            notifyWishlistUpdated();
          }
        } catch {
          // ignore network errors gracefully
        }
      },
    }),
    { name: "shoe-store-wishlist" }
  )
);
