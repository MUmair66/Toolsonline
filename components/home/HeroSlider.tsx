"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Zap } from "lucide-react";
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

const DURATION = 6500;

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
      className="relative overflow-hidden bg-slate-950 text-white"
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
      {/* Background */}
      <div className="bg-dots-dark pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-40 right-0 h-[36rem] w-[36rem] rounded-full bg-brand-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -left-24 h-[28rem] w-[28rem] rounded-full bg-brand-600/20 blur-3xl" />
      <div className="bg-hazard pointer-events-none absolute inset-x-0 bottom-0 h-1.5 opacity-90" />

      {/* Slides share one grid cell so the section takes the tallest slide's height */}
      <div className="container-x relative grid">
        {slides.map((s, i) => {
          const active = i === index;
          return (
            <div
              key={s.key}
              className={cn(
                "col-start-1 row-start-1 grid items-center gap-8 py-12 transition-opacity duration-700 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:py-20",
                active ? "opacity-100" : "pointer-events-none opacity-0"
              )}
              aria-hidden={!active}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
            >
              {/* Copy */}
              <div key={active ? `on-${index}` : "off"} className="order-2 lg:order-1">
                <span className={cn("inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-400/10 px-3 py-1 text-xs font-semibold tracking-wide text-brand-300 uppercase", active && "animate-fade-up")}>
                  <Zap className="h-3.5 w-3.5" /> {s.eyebrow} · {s.categoryCount} products
                </span>
                <h2
                  className={cn("mt-5 text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl lg:text-6xl", active && "animate-fade-up")}
                  style={{ animationDelay: "80ms" }}
                >
                  {s.title}
                </h2>
                <p className={cn("mt-5 max-w-xl text-base text-slate-300 sm:text-lg", active && "animate-fade-up")} style={{ animationDelay: "160ms" }}>
                  {s.text}
                </p>
                <div className={cn("mt-6 flex flex-wrap gap-2", active && "animate-fade-up")} style={{ animationDelay: "220ms" }}>
                  {s.product.specs.map((sp) => (
                    <span key={sp} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-white/10">
                      {sp}
                    </span>
                  ))}
                </div>
                <div className={cn("mt-8 flex flex-wrap items-center gap-3", active && "animate-fade-up")} style={{ animationDelay: "300ms" }}>
                  <Link
                    href={s.categoryHref}
                    tabIndex={active ? 0 : -1}
                    className="btn bg-brand-400 !px-6 !py-3 !text-base font-bold text-slate-950 shadow-lg shadow-brand-400/20 hover:bg-brand-300"
                  >
                    Shop {s.eyebrow} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href={s.product.href}
                    tabIndex={active ? 0 : -1}
                    className="btn border border-white/20 !px-6 !py-3 !text-base text-white hover:bg-white/10"
                  >
                    View {s.product.name.split(" ").slice(0, 3).join(" ")}
                  </Link>
                </div>
                <p className={cn("mt-6 text-sm text-slate-400", active && "animate-fade-up")} style={{ animationDelay: "360ms" }}>
                  Prices from <span className="text-lg font-bold text-white">{s.fromPrice}</span>
                </p>
              </div>

              {/* Visual */}
              <div className="order-1 lg:order-2">
                <div className={cn("relative mx-auto max-w-md lg:max-w-none", active && "animate-fade-up")} style={{ animationDelay: "120ms" }}>
                  <div className="absolute inset-6 rounded-full bg-brand-400/25 blur-3xl" />
                  <Link href={s.product.href} tabIndex={-1} className="relative block aspect-[4/3] overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-white/10 sm:aspect-[5/4]">
                    <SafeImage src={s.product.image} alt={s.product.name} className="h-full w-full object-contain p-6 transition duration-700 hover:scale-105 sm:p-10" />
                  </Link>
                  <div className="animate-float absolute -bottom-5 left-4 rounded-2xl bg-slate-900/95 px-4 py-3 shadow-2xl ring-1 ring-white/10 backdrop-blur sm:left-6">
                    <p className="max-w-[14rem] truncate text-xs text-slate-400">{s.product.name}</p>
                    <p className="text-xl font-extrabold text-brand-400">{s.product.price}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Controls */}
        {count > 1 && (
          <div className="relative col-start-1 row-start-1 flex items-end justify-between self-end pb-6 lg:pb-8">
            <div className="flex items-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => go(i)}
                  className={cn("relative h-1.5 overflow-hidden rounded-full bg-white/20 transition-all", i === index ? "w-12" : "w-6 hover:bg-white/40")}
                  aria-label={`Show slide ${i + 1}: ${s.eyebrow}`}
                  aria-current={i === index}
                >
                  {i === index && (
                    <span
                      key={`${index}-${paused}`}
                      className="animate-fill absolute inset-y-0 left-0 rounded-full bg-brand-400"
                      style={{ animationDuration: `${DURATION}ms`, animationPlayState: paused ? "paused" : "running" }}
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="hidden gap-2 sm:flex">
              <button onClick={() => go(index - 1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-white/10" aria-label="Previous slide">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={() => go(index + 1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-400 text-slate-950 transition hover:bg-brand-300" aria-label="Next slide">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
