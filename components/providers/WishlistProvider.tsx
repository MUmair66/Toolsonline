"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type WishlistItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  stock: number;
};

type WishlistContextValue = {
  items: WishlistItem[];
  ready: boolean;
  has: (productId: string) => boolean;
  toggle: (item: WishlistItem) => boolean; // returns true if now in wishlist
  remove: (productId: string) => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);
const KEY = "shopnext-wishlist";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items, ready]);

  const value = useMemo<WishlistContextValue>(
    () => ({
      items,
      ready,
      has: (id) => items.some((i) => i.productId === id),
      toggle: (item) => {
        const exists = items.some((i) => i.productId === item.productId);
        setItems((prev) => (exists ? prev.filter((i) => i.productId !== item.productId) : [...prev, item]));
        return !exists;
      },
      remove: (id) => setItems((prev) => prev.filter((i) => i.productId !== id)),
    }),
    [items, ready]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
