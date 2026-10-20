"use client";

import { createContext, useContext } from "react";
import { formatPrice } from "@/lib/utils";

export type PublicSettings = {
  storeName: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  currency: string;
  shippingFee: number;
  freeShippingThreshold: number;
  taxRate: number;
  announcement: string | null;
};

const StoreContext = createContext<PublicSettings | null>(null);

export function StoreProvider({ settings, children }: { settings: PublicSettings; children: React.ReactNode }) {
  return <StoreContext.Provider value={settings}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function usePrice() {
  const { currency } = useStore();
  return (n: number) => formatPrice(n, currency);
}
