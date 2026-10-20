"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Minus, Plus, ShoppingCart, Zap } from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { useWishlist, type WishlistItem } from "@/components/providers/WishlistProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { cn } from "@/lib/utils";

type Item = WishlistItem;

export function WishlistButton({ item, large }: { item: Item; large?: boolean }) {
  const wishlist = useWishlist();
  const toast = useToast();
  const active = wishlist.has(item.productId);
  return (
    <button
      onClick={() => {
        const added = wishlist.toggle(item);
        toast(added ? "Added to wishlist" : "Removed from wishlist");
      }}
      className={cn(
        "flex items-center justify-center rounded-full transition",
        large ? "h-12 w-12 border border-slate-300 hover:bg-slate-50" : "h-9 w-9 bg-white/90 shadow-sm backdrop-blur hover:bg-white",
        active && "text-red-500"
      )}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart className={cn("h-5 w-5", active && "fill-red-500")} />
    </button>
  );
}

export function QuickAdd({ item }: { item: Item }) {
  const cart = useCart();
  const toast = useToast();
  const out = item.stock <= 0;
  return (
    <button
      disabled={out}
      onClick={() => {
        cart.add(item, 1);
        toast(`"${item.name}" added to cart`);
      }}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300"
      aria-label="Add to cart"
      title={out ? "Out of stock" : "Add to cart"}
    >
      <ShoppingCart className="h-4 w-4" />
    </button>
  );
}

/** Full-width "Add to cart" button used on hover over product cards. */
export function AddToCartBar({ item }: { item: Item }) {
  const cart = useCart();
  const toast = useToast();
  const out = item.stock <= 0;
  return (
    <button
      disabled={out}
      onClick={() => {
        cart.add(item, 1);
        toast(`"${item.name}" added to cart`);
      }}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900/95 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      <ShoppingCart className="h-4 w-4" /> {out ? "Sold out" : "Add to cart"}
    </button>
  );
}

export function QuantityInput({ value, onChange, max }: { value: number; onChange: (n: number) => void; max: number }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-300">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="p-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        disabled={value <= 1}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        type="number"
        value={value}
        min={1}
        max={max}
        onChange={(e) => onChange(Math.max(1, Math.min(max, Number(e.target.value) || 1)))}
        className="w-12 [appearance:textfield] border-x border-slate-300 py-2 text-center text-sm font-semibold focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="Quantity"
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="p-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AddToCartPanel({ item }: { item: Item }) {
  const cart = useCart();
  const toast = useToast();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const out = item.stock <= 0;

  if (out) {
    return (
      <div className="flex items-center gap-3">
        <button disabled className="btn-primary flex-1 !py-3">
          Out of stock
        </button>
        <WishlistButton item={item} large />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-slate-700">Quantity</span>
        <QuantityInput value={qty} onChange={setQty} max={item.stock} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            cart.add(item, qty);
            toast(`${qty} × "${item.name}" added to cart`);
          }}
          className="btn-secondary flex-1 !py-3"
        >
          <ShoppingCart className="h-4 w-4" /> Add to cart
        </button>
        <button
          onClick={() => {
            cart.add(item, qty);
            router.push("/checkout");
          }}
          className="btn-primary flex-1 !py-3"
        >
          <Zap className="h-4 w-4" /> Buy now
        </button>
        <WishlistButton item={item} large />
      </div>
    </div>
  );
}
