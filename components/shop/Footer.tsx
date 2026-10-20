import Link from "next/link";
import { Mail, Phone, ShieldCheck, Truck, RotateCcw, Headphones } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/utils";

export async function Footer() {
  const s = await getSettings();
  const perks = [
    {
      icon: Truck,
      title: "Free Shipping",
      text: s.freeShippingThreshold > 0 ? `On orders over ${formatPrice(s.freeShippingThreshold, s.currency)}` : "Fast delivery",
    },
    { icon: RotateCcw, title: "Easy Returns", text: "30-day return policy" },
    { icon: ShieldCheck, title: "Secure Payment", text: "100% protected checkout" },
    { icon: Headphones, title: "24/7 Support", text: "We're here to help" },
  ];

  return (
    <footer className="mt-20 border-t border-slate-200 bg-slate-50">
      <div className="container-x grid grid-cols-2 gap-6 border-b border-slate-200 py-10 lg:grid-cols-4">
        {perks.map((p) => (
          <div key={p.title} className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
              <p.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">{p.title}</p>
              <p className="text-xs text-slate-500">{p.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="container-x grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-extrabold">{s.storeName}</p>
          <p className="mt-2 text-sm text-slate-500">{s.tagline}</p>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> {s.contactEmail}
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> {s.contactPhone}
            </p>
          </div>
        </div>
        <div>
          <p className="font-semibold">Shop</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link href="/products" className="hover:text-slate-900">All Products</Link></li>
            <li><Link href="/categories" className="hover:text-slate-900">Categories</Link></li>
            <li><Link href="/products?sort=newest" className="hover:text-slate-900">New Arrivals</Link></li>
            <li><Link href="/products?sale=1" className="hover:text-slate-900">On Sale</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">Account</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link href="/account" className="hover:text-slate-900">My Account</Link></li>
            <li><Link href="/account/orders" className="hover:text-slate-900">Order History</Link></li>
            <li><Link href="/wishlist" className="hover:text-slate-900">Wishlist</Link></li>
            <li><Link href="/cart" className="hover:text-slate-900">Cart</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">Company</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link href="/about" className="hover:text-slate-900">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-slate-900">Contact</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200 py-5 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {s.storeName}. All rights reserved.
      </div>
    </footer>
  );
}
