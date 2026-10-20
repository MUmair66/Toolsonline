"use client";

import Link from "next/link";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { useWishlist } from "@/components/providers/WishlistProvider";
import { useCart } from "@/components/providers/CartProvider";
import { usePrice } from "@/components/providers/StoreProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { SafeImage } from "@/components/ui/SafeImage";

export function WishlistView({ compact }: { compact?: boolean } = {}) {
  const wishlist = useWishlist();
  const cart = useCart();
  const fmt = usePrice();
  const toast = useToast();

  if (!wishlist.ready) return <div className="mt-10 h-64 animate-pulse rounded-2xl bg-slate-100" />;

  if (!wishlist.items.length) {
    return (
      <div className="card mt-8 flex flex-col items-center px-6 py-20 text-center">
        <Heart className="h-14 w-14 text-slate-300" />
        <h2 className="mt-4 text-xl font-semibold">Your wishlist is empty</h2>
        <p className="mt-1 text-slate-500">Tap the heart on any product to save it for later.</p>
        <Link href="/products" className="btn-primary mt-6">
          Explore products
        </Link>
      </div>
    );
  }

  return (
    <div className={`mt-8 grid grid-cols-2 gap-4 sm:gap-6 ${compact ? "xl:grid-cols-3" : "lg:grid-cols-4"}`}>
      {wishlist.items.map((item) => (
        <div key={item.productId} className="card flex flex-col overflow-hidden">
          <Link href={`/products/${item.slug}`} className="aspect-square bg-slate-100">
            <SafeImage src={item.image} alt={item.name} className="h-full w-full object-cover" />
          </Link>
          <div className="flex flex-1 flex-col p-4">
            <Link href={`/products/${item.slug}`} className="line-clamp-2 font-semibold hover:text-brand-600">
              {item.name}
            </Link>
            <p className="mt-1 font-bold">{fmt(item.price)}</p>
            <div className="mt-auto flex gap-2 pt-4">
              <button
                disabled={item.stock <= 0}
                onClick={() => {
                  cart.add(item, 1);
                  wishlist.remove(item.productId);
                  toast("Moved to cart");
                }}
                className="btn-primary flex-1 !px-2 !py-2"
              >
                <ShoppingCart className="h-4 w-4" /> {item.stock > 0 ? "Move to cart" : "Sold out"}
              </button>
              <button
                onClick={() => wishlist.remove(item.productId)}
                className="btn-secondary !px-2.5 !py-2"
                aria-label="Remove from wishlist"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
