import { create } from "zustand";
import { toggleWishlistDb } from "@/features/pdp/actions";
import { trackAddToCart, trackRemoveFromCart, trackAddToWishlist } from "@/lib/analytics";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  quantity: number;
  variantName?: string;
  shape?: string;
  length?: string;
  size?: string;
  productId?: string;
}

interface CartStore {
  cart: CartItem[];
  wishlist: string[]; // array of product IDs or slugs
  cartOpen: boolean;
  searchOpen: boolean;
  setCartOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  addToCart: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  toggleWishlist: (productId: string, itemDetails?: { name?: string; price?: number }) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  clearCart: () => void;
  loadPersistedData: () => void;
}

export const useCartStore = create<CartStore>((set, get) => ({
  cart: [],
  wishlist: [],
  cartOpen: false,
  searchOpen: false,
  setCartOpen: (open) => set({ cartOpen: open }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  
  addToCart: (item, qty = 1) => {
    // Track GA4 event
    trackAddToCart({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: qty,
      item_variant: item.variantName || `${item.shape || ''} ${item.length || ''} ${item.size || ''}`.trim(),
    });

    set((state) => {
      const existingIndex = state.cart.findIndex((i) => i.id === item.id);
      let newCart;
      if (existingIndex > -1) {
        newCart = [...state.cart];
        newCart[existingIndex].quantity += qty;
      } else {
        newCart = [...state.cart, { ...item, quantity: qty }];
      }
      
      // Persist
      if (typeof window !== "undefined") {
        localStorage.setItem("snail_cart", JSON.stringify(newCart));
      }
      
      return { cart: newCart, cartOpen: true };
    });
  },
  
  removeFromCart: (itemId) => {
    // Find the item to track before removal
    const item = get().cart.find((i) => i.id === itemId);
    if (item) {
      trackRemoveFromCart({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
        item_variant: item.variantName,
      });
    }

    set((state) => {
      const newCart = state.cart.filter((item) => item.id !== itemId);
      if (typeof window !== "undefined") {
        localStorage.setItem("snail_cart", JSON.stringify(newCart));
      }
      return { cart: newCart };
    });
  },
  
  updateQuantity: (itemId, qty) => {
    set((state) => {
      const newCart = state.cart
        .map((item) => (item.id === itemId ? { ...item, quantity: Math.max(1, qty) } : item));
      if (typeof window !== "undefined") {
        localStorage.setItem("snail_cart", JSON.stringify(newCart));
      }
      return { cart: newCart };
    });
  },
  
  toggleWishlist: async (productId, itemDetails) => {
    // 1. Optimistic local update
    let originallyFav = false;
    set((state) => {
      originallyFav = state.wishlist.includes(productId);
      const newWishlist = originallyFav
        ? state.wishlist.filter((id) => id !== productId)
        : [...state.wishlist, productId];
      
      // Track GA4 event if adding to wishlist
      if (!originallyFav) {
        trackAddToWishlist({
          item_id: productId,
          item_name: itemDetails?.name || `Product ${productId}`,
          price: itemDetails?.price,
        });
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("snail_wishlist", JSON.stringify(newWishlist));
      }
      return { wishlist: newWishlist };
    });

    try {
      // 2. Database update
      const res = await toggleWishlistDb(productId);
      if (res.success) {
        const isFav = res.isWishlisted;
        set((state) => {
          // Adjust state based on database response
          const alreadyCorrect = state.wishlist.includes(productId) === isFav;
          if (alreadyCorrect) return {};
          
          const newWishlist = isFav
            ? [...state.wishlist.filter((id) => id !== productId), productId]
            : state.wishlist.filter((id) => id !== productId);
          
          if (typeof window !== "undefined") {
            localStorage.setItem("snail_wishlist", JSON.stringify(newWishlist));
          }
          return { wishlist: newWishlist };
        });
      } else if (res.error === "guest") {
        // Logged-out state is already handled by optimistic local update, do nothing
      } else {
        // Revert on backend error
        set((state) => {
          const revertedWishlist = originallyFav
            ? [...state.wishlist.filter((id) => id !== productId), productId]
            : state.wishlist.filter((id) => id !== productId);
          if (typeof window !== "undefined") {
            localStorage.setItem("snail_wishlist", JSON.stringify(revertedWishlist));
          }
          return { wishlist: revertedWishlist };
        });
      }
    } catch (err) {
      console.error("Error toggling database wishlist:", err);
      // Revert on request failure
      set((state) => {
        const revertedWishlist = originallyFav
          ? [...state.wishlist.filter((id) => id !== productId), productId]
          : state.wishlist.filter((id) => id !== productId);
        if (typeof window !== "undefined") {
          localStorage.setItem("snail_wishlist", JSON.stringify(revertedWishlist));
        }
        return { wishlist: revertedWishlist };
      });
    }
  },
  
  isInWishlist: (productId) => {
    return get().wishlist.includes(productId);
  },
  
  clearCart: () => {
    set({ cart: [] });
    if (typeof window !== "undefined") {
      localStorage.removeItem("snail_cart");
    }
  },
  
  loadPersistedData: () => {
    if (typeof window === "undefined") return;
    try {
      const savedCart = localStorage.getItem("snail_cart");
      const savedWishlist = localStorage.getItem("snail_wishlist");
      
      set({
        cart: savedCart ? JSON.parse(savedCart) : [],
        wishlist: savedWishlist ? JSON.parse(savedWishlist) : [],
      });
    } catch (e) {
      console.error("Failed to load persisted cart/wishlist:", e);
    }
  },
}));
