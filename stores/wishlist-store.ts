import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistState {
  wishlistIds: string[];
  hasFetched: boolean;
  setWishlistIds: (ids: string[]) => void;
  toggleWishlistId: (productId: string) => boolean;
  isWishlisted: (productId: string) => boolean;
  fetchWishlist: () => Promise<void>;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      wishlistIds: [],
      hasFetched: false,

      setWishlistIds: (ids) => set({ wishlistIds: ids, hasFetched: true }),

      toggleWishlistId: (productId) => {
        const current = get().wishlistIds;
        const exists = current.includes(productId);
        const next = exists
          ? current.filter((id) => id !== productId)
          : [...current, productId];

        set({ wishlistIds: next });
        return !exists;
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
          }
        } catch {
          // ignore network errors gracefully
        }
      },
    }),
    { name: "shoe-store-wishlist" }
  )
);
