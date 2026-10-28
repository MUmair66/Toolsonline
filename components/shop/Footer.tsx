import Link from "next/link";
import { Banknote, Mail, MessageCircle, Phone, ShieldCheck, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/utils";

export async function Footer() {
  const s = await getSettings();
  const [categories, brands] = await Promise.all([
    db.category.findMany({ where: { products: { some: { active: true } } }, orderBy: { name: "asc" }, take: 8, select: { name: true, slug: true } }),
    db.brand.findMany({ where: { products: { some: { active: true } } }, orderBy: { name: "asc" }, select: { name: true, slug: true } }),
  ]);
  const perks = [
    {
      icon: Truck,
      title: s.freeShippingThreshold > 0 ? "Free delivery" : "Delivery",
      text: s.freeShippingThreshold > 0 ? `On orders over ${formatPrice(s.freeShippingThreshold, s.currency)}` : `Flat ${formatPrice(s.shippingFee, s.currency)}`,
    },
    { icon: Banknote, title: "Cash on delivery", text: "Pay when your order arrives" },
    { icon: ShieldCheck, title: "Secure checkout", text: "Your details stay private" },
    { icon: MessageCircle, title: "Need help?", text: "Contact us any time", href: "/contact" },
  ];
  const linkCls = "text-slate-400 transition hover:text-brand-400";

  return (
    <footer className="mt-20 bg-slate-950 text-slate-300">
      <div className="border-b border-white/10">
        <div className="container-x grid grid-cols-2 gap-6 py-10 lg:grid-cols-4">
          {perks.map((p) => {
            const inner = (
              <>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-400 text-slate-950">
                  <p.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{p.title}</p>
                  <p className="text-xs text-slate-400">{p.text}</p>
                </div>
              </>
            );
            return p.href ? (
              <Link key={p.title} href={p.href} className="flex items-center gap-3">{inner}</Link>
            ) : (
              <div key={p.title} className="flex items-center gap-3">{inner}</div>
            );
          })}
        </div>
      </div>

      <div className="container-x grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link href="/" aria-label={`${s.storeName} — home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.webp" alt={s.storeName} width={700} height={138} className="h-11 w-auto" />
          </Link>
          <p className="mt-4 max-w-sm text-sm text-slate-400">{s.tagline}. Power tools and machinery for professionals and workshops.</p>
          <div className="mt-5 space-y-2 text-sm">
            <a href={`mailto:${s.contactEmail}`} className={`flex items-center gap-2 ${linkCls}`}>
              <Mail className="h-4 w-4" /> {s.contactEmail}
            </a>
            <a href={`tel:${s.contactPhone.replace(/[^\d+]/g, "")}`} className={`flex items-center gap-2 ${linkCls}`}>
              <Phone className="h-4 w-4" /> {s.contactPhone}
            </a>
          </div>
        </div>
        <div>
          <p className="font-semibold text-white">Shop</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/products" className={linkCls}>All products</Link></li>
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}><Link href={`/products?category=${c.slug}`} className={linkCls}>{c.name}</Link></li>
            ))}
            <li><Link href="/categories" className={linkCls}>All categories →</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">Brands</p>
          <ul className="mt-3 space-y-2 text-sm">
            {brands.map((b) => (
              <li key={b.slug}><Link href={`/products?brand=${b.slug}`} className={linkCls}>{b.name}</Link></li>
            ))}
          </ul>
          <p className="mt-6 font-semibold text-white">Account</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/account" className={linkCls}>My account</Link></li>
            <li><Link href="/account/orders" className={linkCls}>Track my order</Link></li>
            <li><Link href="/wishlist" className={linkCls}>Wishlist</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">Company</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/about" className={linkCls}>About us</Link></li>
            <li><Link href="/contact" className={linkCls}>Contact</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {s.storeName}. All rights reserved.
      </div>
    </footer>
  );
}
