"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePrice } from "@/components/providers/StoreProvider";
import { SafeImage } from "@/components/ui/SafeImage";

type Item = { slug: string; name: string; price: number; image: string };
const KEY = "shopnext-recent";

/** Records the current product and shows the shopper's other recently viewed products. */
export function RecentlyViewed({ current }: { current: Item }) {
  const [items, setItems] = useState<Item[]>([]);
  const fmt = usePrice();

  useEffect(() => {
    let list: Item[] = [];
    try {
      list = JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {}
    setItems(list.filter((i) => i.slug !== current.slug).slice(0, 6));
    const next = [current, ...list.filter((i) => i.slug !== current.slug)].slice(0, 12);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.slug]);

  if (!items.length) return null;
  return (
    <section className="mt-20">
      <h2 className="mb-6 text-2xl font-bold">Recently viewed</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map((i) => (
          <Link key={i.slug} href={`/products/${i.slug}`} className="group w-40 shrink-0">
            <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
              <SafeImage src={i.image} alt={i.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            </div>
            <p className="mt-2 line-clamp-1 text-sm font-medium group-hover:text-brand-600">{i.name}</p>
            <p className="text-sm font-bold">{fmt(i.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
