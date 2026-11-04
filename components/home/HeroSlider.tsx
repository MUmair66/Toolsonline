"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { SafeImage } from "@/components/ui/SafeImage";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  key: string;
  eyebrow: string; // e.g. category name
  title: string;
  text: string;
  categoryHref: string;
  categoryCount: number;
  fromPrice: string; // formatted
  product: { name: string; href: string; image: string; price: string; specs: string[] };
};

const DURATION = 7000;

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;

  const go = (i: number) => setIndex(((i % count) + count) % count);

  useEffect(() => {
    if (paused || count < 2) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), DURATION);
    return () => clearTimeout(t);
  }, [index, paused, count]);

  if (!count) return null;

  return (
    <section
      className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
      aria-roledescription="carousel"
      aria-label="Featured tools"
    >
      {/* Slides share one grid cell so the section takes the tallest slide's height */}
      <div className="container-x relative grid">
        {slides.map((s, i) => {
          const active = i === index;
          return (
            <div
              key={s.key}
              className={cn(
                "col-start-1 row-start-1 grid items-center gap-10 pt-10 pb-20 transition-opacity duration-700 sm:pt-14 lg:grid-cols-2 lg:gap-16 lg:pt-16 lg:pb-24",
                active ? "opacity-100" : "pointer-events-none opacity-0"
              )}
              aria-hidden={!active}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
            >
              {/* Copy */}
              <div key={active ? `on-${index}` : "off"} className="order-2 lg:order-1">
                <p className={cn("flex items-center gap-2 text-sm font-semibold text-brand-600", active && "animate-fade-up")}>
                  <span className="h-px w-6 bg-brand-500" />
                  {s.eyebrow} · {s.categoryCount} products
                </p>
                <h2
                  className={cn("mt-4 text-3xl leading-tight font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl", active && "animate-fade-up")}
                  style={{ animationDelay: "60ms" }}
                >
                  {s.title}
                </h2>
                {s.text && (
                  <p className={cn("mt-4 line-clamp-3 max-w-xl text-base leading-relaxed text-slate-600", active && "animate-fade-up")} style={{ animationDelay: "120ms" }}>
                    {s.text}
                  </p>
                )}
                {s.product.specs.length > 0 && (
                  <ul className={cn("mt-6 flex flex-wrap gap-2", active && "animate-fade-up")} style={{ animationDelay: "180ms" }}>
                    {s.product.specs.map((sp) => (
                      <li key={sp} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                        {sp}
                      </li>
                    ))}
                  </ul>
                )}
                <div className={cn("mt-8 flex flex-wrap items-center gap-3", active && "animate-fade-up")} style={{ animationDelay: "240ms" }}>
                  <Link href={s.categoryHref} tabIndex={active ? 0 : -1} className="btn bg-slate-900 !px-5 !py-3 text-white hover:bg-slate-800">
                    Shop {s.eyebrow} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href={s.product.href} tabIndex={active ? 0 : -1} className="btn border border-slate-300 bg-white !px-5 !py-3 text-slate-700 hover:border-slate-400 hover:text-slate-900">
                    View product
                  </Link>
                </div>
                <p className={cn("mt-6 text-sm text-slate-500", active && "animate-fade-up")} style={{ animationDelay: "300ms" }}>
                  Prices from <span className="font-semibold text-slate-900">{s.fromPrice}</span>
                </p>
              </div>

              {/* Visual */}
              <div className="order-1 lg:order-2">
                <div className={cn("relative mx-auto max-w-md lg:max-w-none", active && "animate-fade-up")} style={{ animationDelay: "100ms" }}>
                  <Link
                    href={s.product.href}
                    tabIndex={-1}
                    className="relative block aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <SafeImage src={s.product.image} alt={s.product.name} className="h-full w-full object-contain p-8 transition duration-700 hover:scale-[1.03] sm:p-12" />
                  </Link>
                  <div className="absolute right-4 bottom-4 left-4 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:left-auto sm:max-w-xs">
                    <p className="min-w-0 truncate text-sm text-slate-600">{s.product.name}</p>
                    <p className="shrink-0 font-bold text-slate-900">{s.product.price}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Controls */}
        {count > 1 && (
          <div className="relative col-start-1 row-start-1 flex items-center justify-between self-end pb-6 lg:pb-8">
            <div className="flex items-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => go(i)}
                  className={cn("relative h-1 overflow-hidden rounded-full bg-slate-200 transition-all", i === index ? "w-10" : "w-5 hover:bg-slate-300")}
                  aria-label={`Show slide ${i + 1}: ${s.eyebrow}`}
                  aria-current={i === index}
                >
                  {i === index && (
                    <span
                      key={`${index}-${paused}`}
                      className="animate-fill absolute inset-y-0 left-0 rounded-full bg-slate-900"
                      style={{ animationDuration: `${DURATION}ms`, animationPlayState: paused ? "paused" : "running" }}
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="hidden gap-2 sm:flex">
              <button onClick={() => go(index - 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-slate-400" aria-label="Previous slide">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => go(index + 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-slate-400" aria-label="Next slide">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
