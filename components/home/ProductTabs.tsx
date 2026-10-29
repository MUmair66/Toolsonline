"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { ProductCard, type CardProduct } from "@/components/shop/ProductCard";
import { cn } from "@/lib/utils";

export type ProductTab = { key: string; label: string; href: string; count: number; products: CardProduct[] };

export function ProductTabs({ tabs, currency }: { tabs: ProductTab[]; currency: string }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const tab = tabs.find((t) => t.key === active) ?? tabs[0];
  if (!tab) return null;

  return (
    <div>
      <div className="scrollbar-none -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Product categories">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === tab.key}
            onClick={() => setActive(t.key)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition",
              t.key === tab.key ? "bg-slate-950 text-white shadow-lg shadow-slate-950/20" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-950 hover:ring-slate-300"
            )}
          >
            {t.label}
            <span className={cn("rounded-full px-2 py-0.5 text-[11px]", t.key === tab.key ? "bg-brand-400 text-slate-950" : "bg-slate-100 text-slate-500")}>{t.count}</span>
          </button>
        ))}
      </div>

      <div key={tab.key} role="tabpanel" className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
        {tab.products.map((p, i) => (
          <div key={p.id} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
            <ProductCard product={p} currency={currency} />
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link href={tab.href} className="btn-secondary !rounded-full !px-6">
          View all {tab.count} {tab.label.toLowerCase()} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
