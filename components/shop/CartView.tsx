"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag, Trash2, Truck } from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { usePrice, useStore } from "@/components/providers/StoreProvider";
import { SafeImage } from "@/components/ui/SafeImage";
import { QuantityInput } from "./ProductActions";

export function CartView() {
  const cart = useCart();
  const fmt = usePrice();
  const store = useStore();

  if (!cart.ready) return <div className="mt-10 h-64 animate-pulse rounded-2xl bg-slate-100" />;

  if (!cart.items.length) {
    return (
      <div className="card mt-8 flex flex-col items-center px-6 py-20 text-center">
        <ShoppingBag className="h-14 w-14 text-slate-300" />
        <h2 className="mt-4 text-xl font-semibold">Your cart is empty</h2>
        <p className="mt-1 text-slate-500">Looks like you haven&apos;t added anything yet.</p>
        <Link href="/products" className="btn-primary mt-6">
          Start shopping
        </Link>
      </div>
    );
  }

  const shipping =
    store.freeShippingThreshold > 0 && cart.subtotal >= store.freeShippingThreshold ? 0 : store.shippingFee;
  const remaining = store.freeShippingThreshold - cart.subtotal;
  const progress = store.freeShippingThreshold > 0 ? Math.min(100, (cart.subtotal / store.freeShippingThreshold) * 100) : 100;

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {store.freeShippingThreshold > 0 && (
          <div className="card mb-4 p-4">
            <p className="flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4 text-brand-600" />
              {remaining > 0 ? (
                <>
                  Add <strong>{fmt(remaining)}</strong> more for <strong>free shipping</strong>
                </>
              ) : (
                <strong className="text-emerald-700">You&apos;ve unlocked free shipping!</strong>
              )}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        <ul className="card divide-y divide-slate-100">
          {cart.items.map((item) => (
            <li key={item.productId} className="flex gap-4 p-4 sm:p-5">
              <Link href={`/products/${item.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                <SafeImage src={item.image} alt={item.name} className="h-full w-full object-cover" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/products/${item.slug}`} className="font-semibold hover:text-brand-600">
                    {item.name}
                  </Link>
                  <p className="font-bold whitespace-nowrap">{fmt(item.price * item.quantity)}</p>
                </div>
                <p className="text-sm text-slate-500">{fmt(item.price)} each</p>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <QuantityInput value={item.quantity} max={item.stock} onChange={(n) => cart.update(item.productId, n)} />
                  <button
                    onClick={() => cart.remove(item.productId)}
                    className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Remove</span>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between">
          <Link href="/products" className="text-sm font-semibold text-brand-600 hover:underline">
            ← Continue shopping
          </Link>
          <button onClick={() => cart.clear()} className="text-sm text-slate-500 hover:text-red-600">
            Clear cart
          </button>
        </div>
      </div>

      <div>
        <div className="card sticky top-24 p-6">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal ({cart.count} items)</dt>
              <dd className="font-medium">{fmt(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Shipping</dt>
              <dd className="font-medium">{shipping === 0 ? "Free" : fmt(shipping)}</dd>
            </div>
            {store.taxRate > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Tax ({store.taxRate}%)</dt>
                <dd className="font-medium">Calculated at checkout</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
              <dt className="font-semibold">Estimated total</dt>
              <dd className="font-bold">{fmt(cart.subtotal + shipping)}</dd>
            </div>
          </dl>
          <Link href="/checkout" className="btn-primary mt-6 w-full !py-3">
            Proceed to checkout <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-3 text-center text-xs text-slate-400">Have a coupon? Apply it at checkout.</p>
        </div>
      </div>
    </div>
  );
}
