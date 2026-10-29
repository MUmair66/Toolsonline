"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard, type CardProduct } from "@/components/shop/ProductCard";
import { cn } from "@/lib/utils";

/** Horizontally scrolling product row with snap points and arrow buttons. */
export function ProductRail({ products, currency, title, subtitle }: { products: CardProduct[]; currency: string; title: string; subtitle?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };
  useEffect(update, []);

  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex gap-2">
          {([-1, 1] as const).map((d) => (
            <button
              key={d}
              onClick={() => scroll(d)}
              disabled={d === -1 ? edge.start : edge.end}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-30",
                d === 1 ? "bg-slate-950 text-white hover:bg-slate-800" : "border border-slate-300 text-slate-700 hover:bg-slate-100"
              )}
              aria-label={d === 1 ? "Scroll right" : "Scroll left"}
            >
              {d === 1 ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
          ))}
        </div>
      </div>
      <div ref={ref} onScroll={update} className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 sm:mx-0 sm:gap-6 sm:px-0">
        {products.map((p) => (
          <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[23%]">
            <ProductCard product={p} currency={currency} />
          </div>
        ))}
      </div>
    </div>
  );
}
