import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, Hammer, Truck, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "About us" };

export default async function AboutPage() {
  const s = await getSettings();
  const [productCount, categoryCount, brands] = await Promise.all([
    db.product.count({ where: { active: true } }),
    db.category.count({ where: { products: { some: { active: true } } } }),
    db.brand.findMany({ where: { products: { some: { active: true } } }, select: { name: true } }),
  ]);
  const values = [
    { icon: Wrench, title: "Tools for real work", text: "Grinders, drills, hammers, cutters, welding machines and heavy machinery for workshops and job sites." },
    { icon: Hammer, title: "Clear specifications", text: "Every product lists its power, size and speed so you can compare tools side by side." },
    {
      icon: Truck,
      title: "Delivery",
      text: s.freeShippingThreshold > 0 ? `Free delivery on orders over ${formatPrice(s.freeShippingThreshold, s.currency)}.` : `Flat delivery fee of ${formatPrice(s.shippingFee, s.currency)}.`,
    },
    { icon: Banknote, title: "Cash on delivery", text: "Pay when your order arrives, or pay by card at checkout." },
  ];
  return (
    <div>
      <section className="bg-slate-950 text-white">
        <div className="container-x grid items-center gap-10 py-16 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold tracking-wide text-brand-400 uppercase">About {s.storeName}</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight">{s.tagline}.</h1>
            <p className="mt-5 text-lg text-slate-300">
              {s.storeName} is an online store for professional power tools and machinery
              {brands.length ? `, including ${brands.map((b) => b.name).join(", ")}` : ""}. Browse the catalog, compare specifications
              and order online.
            </p>
            <Link href="/products" className="btn mt-8 bg-brand-400 font-bold text-slate-950 hover:bg-brand-300">Explore the shop</Link>
          </div>
          <dl className="grid grid-cols-2 gap-4">
            {[
              { k: "Products", v: productCount },
              { k: "Categories", v: categoryCount },
              { k: "Brands", v: brands.length },
              { k: "Payment", v: "COD / Card" },
            ].map((x) => (
              <div key={x.k} className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
                <dt className="text-sm text-slate-400">{x.k}</dt>
                <dd className="mt-1 text-3xl font-extrabold text-brand-400">{x.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <section className="container-x py-16">
        <h2 className="text-center text-3xl font-bold">Why shop with us</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div key={v.title} className="card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-400 text-slate-950">
                <v.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{v.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
