import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Guest cart — stored in localStorage.
 * On login, merge with server cart via /cart/merge.
 */
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [], // { productId, name, price, thumbnail, quantity, size, color }
      serverCart: null, // Populated after login

      // Guest cart operations
      addGuestItem: (product, quantity = 1, size = null, color = null) => {
        const items = get().items;
        const key = `${product.id}-${size}-${color}`;
        const existing = items.find((i) => `${i.productId}-${i.size}-${i.color}` === key);

        if (existing) {
          set({
            items: items.map((i) =>
              `${i.productId}-${i.size}-${i.color}` === key
                ? { ...i, quantity: Math.min(i.quantity + quantity, 99) }
                : i
            ),
          });
        } else {
          set({
            items: [
              ...items,
              {
                productId: product.id,
                name: product.name,
                price: product.sale_price || product.price,
                thumbnail: product.thumbnail_url,
                slug: product.slug,
                quantity,
                size,
                color,
              },
            ],
          });
        }
      },

      updateGuestItem: (productId, size, color, quantity) => {
        const key = `${productId}-${size}-${color}`;
        if (quantity < 1) {
          set({ items: get().items.filter((i) => `${i.productId}-${i.size}-${i.color}` !== key) });
        } else {
          set({
            items: get().items.map((i) =>
              `${i.productId}-${i.size}-${i.color}` === key ? { ...i, quantity } : i
            ),
          });
        }
      },

      removeGuestItem: (productId, size, color) => {
        const key = `${productId}-${size}-${color}`;
        set({ items: get().items.filter((i) => `${i.productId}-${i.size}-${i.color}` !== key) });
      },

      clearGuestCart: () => set({ items: [] }),

      setServerCart: (cart) => set({ serverCart: cart }),

      guestItemCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
      guestTotal: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
    }),
    {
      name: 'guest-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
