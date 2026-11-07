"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SafeImage } from "@/components/ui/SafeImage";
import { cn } from "@/lib/utils";

export type ShowcaseItem = {
  slug: string;
  name: string;
  brand: string | null;
  category: string | null;
  image: string;
  price: string;
  inStock: boolean;
  specs: { label: string; value: string }[];
};

const DURATION = 6000;
// Where the spec labels sit around the product (desktop). Lines point towards the tool.
const CALLOUTS = [
  "left-0 top-[14%] flex-row",
  "right-0 top-[8%] flex-row-reverse text-right",
  "right-0 top-[44%] flex-row-reverse text-right",
];

/**
 * Hero product showcase: large floating photo with spec call-outs, price tag and
 * thumbnails to switch product (auto-advances, pauses on hover).
 */
export function HeroShowcase({ items }: { items: ShowcaseItem[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const item = items[index];

  useEffect(() => {
    if (paused || items.length < 2) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % items.length), DURATION);
    return () => clearTimeout(t);
  }, [index, paused, items.length]);

  if (!item) return null;

  return (
    <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* Stage: fixed aspect ratio so switching products never changes the layout */}
      <div className="relative mx-auto aspect-[5/4] w-full max-w-[560px]">
        <div className="absolute inset-x-[18%] bottom-[14%] h-[8%] rounded-[50%] bg-slate-900/15 blur-xl" />
        <Link href={`/products/${item.slug}`} className="absolute inset-x-[4%] top-[6%] bottom-[12%] block" aria-label={item.name}>
          <SafeImage key={item.slug} src={item.image} alt={item.name} className="animate-fade-up h-full w-full object-contain mix-blend-multiply" />
        </Link>

        {/* Spec call-outs (desktop) */}
        {item.specs.slice(0, 3).map((s, i) => (
          <div key={`${item.slug}-${s.label}`} className={cn("animate-fade-up absolute hidden items-center gap-2 sm:flex", CALLOUTS[i])} style={{ animationDelay: `${120 + i * 80}ms` }}>
            <span className="leading-tight">
              <span className="block text-[11px] text-slate-500">{s.label}</span>
              <span className="block text-sm font-bold text-slate-900">{s.value}</span>
            </span>
            <span className="w-10 border-t border-dashed border-slate-400 lg:w-16" />
            <span className="h-2 w-2 rounded-full bg-slate-900 ring-4 ring-white" />
          </div>
        ))}

        {/* Brand card */}
        {(item.brand || item.category) && (
          <div className="animate-fade-up absolute bottom-[4%] left-0 rounded-2xl bg-white px-4 py-3 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.3)]">
            <p className="text-sm font-extrabold tracking-wide">{item.brand ?? "Toolsonline"}</p>
            {item.category && <p className="text-[11px] text-slate-500">{item.category}</p>}
          </div>
        )}
      </div>

      {/* Price + link */}
      <div className="mx-auto mt-2 flex max-w-[560px] items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-700">{item.name}</p>
          <p className={cn("text-xs font-semibold", item.inStock ? "text-emerald-600" : "text-slate-400")}>● {item.inStock ? "In stock" : "Out of stock"}</p>
        </div>
        <Link href={`/products/${item.slug}`} className="group flex shrink-0 items-baseline gap-2">
          <span className="text-2xl font-extrabold tracking-tight sm:text-3xl">{item.price}</span>
          <ArrowUpRight className="h-5 w-5 self-center transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      {/* Thumbnails + progress */}
      {items.length > 1 && (
        <div className="mx-auto mt-5 max-w-[560px]">
          <div className="flex gap-2.5">
            {items.map((it, i) => (
              <button
                key={it.slug}
                onClick={() => setIndex(i)}
                aria-label={`Show ${it.name}`}
                aria-current={i === index}
                className={cn(
                  "aspect-square w-14 shrink-0 rounded-xl bg-white p-1.5 transition sm:w-16",
                  i === index ? "ring-2 ring-brand-400" : "opacity-70 ring-1 ring-slate-200 hover:opacity-100"
                )}
              >
                <SafeImage src={it.image} alt="" className="h-full w-full object-contain mix-blend-multiply" />
              </button>
            ))}
          </div>
          <div className="mt-4 h-1 w-40 overflow-hidden rounded-full bg-slate-200">
            <span
              key={`${index}-${paused}`}
              className="animate-fill block h-full rounded-full bg-brand-500"
              style={{ animationDuration: `${DURATION}ms`, animationPlayState: paused ? "paused" : "running" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function ShowcaseCta({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-b from-brand-300 to-brand-400 px-6 text-[15px] font-bold text-slate-950 shadow-[0_10px_24px_-8px_rgba(234,179,8,0.7)] transition hover:to-brand-500"
    >
      Shop now <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
    </Link>
  );
}
