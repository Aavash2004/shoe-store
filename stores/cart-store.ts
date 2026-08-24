import {create } from "zustand";
import {persist} from "zustand/middleware";

export type CartItem ={
    variantId: string;
    productId: string;
    productName: string;
    slug: string;
    image: string;
    size:string;
    color: string;
    price: number;
    quantity: number;
};

type CartState ={
    items: CartItem[];
    addItem: (item: CartItem ) => void;
    removeItem: (variantId: String) => void;
    updateQuantity: (variantId: string, quantity:number) => void;
    clearCart: () => void;
} ;

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items:[],
            addItem: (item) => {
                 const existing = get().items.find((i) => i.variantId === item.variantId);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.variantId === item.variantId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          });
        } else {
          set({ items: [...get().items, item] });
        }
      },
      removeItem: (variantId) =>{
       set({ items: get().items.filter((i) => i.variantId !== variantId) });
      },

      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(variantId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.variantId === variantId ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),
    }),
    { name: "shoe-store-cart" }
  )    
);