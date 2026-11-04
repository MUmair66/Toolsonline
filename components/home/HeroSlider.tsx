"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { SafeImage } from "@/components/ui/SafeImage";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  key: string;
  theme: "dark" | "yellow" | "mint";
  eyebrow: string;
  title: string;
  text: string;
  price: string; // formatted, e.g. "Rs. 38,000" or "From Rs. 4,200"
  href: string;
  image: string;
  alt: string;
};

const DURATION = 6000;

const THEMES = {
  dark: { bg: "bg-gradient-to-br from-slate-950 to-slate-800 text-white", sub: "text-slate-300", btn: "bg-brand-400 text-slate-950 hover:bg-brand-300", img: "bg-white" },
  yellow: { bg: "bg-gradient-to-br from-[#ffe46b] to-brand-400 text-slate-950", sub: "text-slate-800", btn: "bg-slate-950 text-white hover:bg-black", img: "bg-white/70" },
  mint: { bg: "bg-gradient-to-br from-[#e8f6f4] to-[#c9ece6] text-slate-950", sub: "text-slate-700", btn: "bg-slate-950 text-white hover:bg-black", img: "bg-white/70" },
} as const;

/** Auto-playing hero carousel (pauses on hover, swipe on touch, dots + arrows). */
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
    <div
      className="relative h-full min-h-[520px] overflow-hidden rounded-2xl bg-slate-950 sm:min-h-[400px]"
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
      {slides.map((s, i) => {
        const t = THEMES[s.theme];
        const active = i === index;
        return (
          <div
            key={s.key}
            className={cn(
              "absolute inset-0 grid content-start items-center gap-5 px-6 pt-7 pb-14 transition-opacity duration-500 sm:grid-cols-[1.1fr_1fr] sm:content-center sm:px-10 sm:py-10 lg:px-14",
              t.bg,
              active ? "opacity-100" : "pointer-events-none opacity-0"
            )}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={!active}
          >
            <div className={cn("order-2 sm:order-1", active && "animate-fade-up")}>
              <p className="text-xs font-bold tracking-[0.12em] uppercase opacity-80 sm:text-[13px]">{s.eyebrow}</p>
              <h2 className="mt-2 text-[26px] leading-[1.1] font-extrabold tracking-tight sm:text-3xl lg:text-[40px]">{s.title}</h2>
              {s.text && <p className={cn("mt-2 line-clamp-2 text-sm sm:text-[15px]", t.sub)}>{s.text}</p>}
              <p className="mt-3 text-xl font-extrabold sm:text-2xl">{s.price}</p>
              <Link
                href={s.href}
                tabIndex={active ? 0 : -1}
                className={cn("mt-5 inline-flex h-12 items-center gap-2 rounded-xl px-6 text-[15px] font-bold transition", t.btn)}
              >
                Shop now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <Link
              href={s.href}
              tabIndex={-1}
              className={cn("order-1 mx-auto block aspect-square w-32 shrink-0 overflow-hidden rounded-2xl p-[8%] sm:order-2 sm:ml-auto sm:w-full sm:max-w-[320px]", t.img)}
            >
              <SafeImage src={s.image} alt={s.alt} className="h-full w-full object-contain mix-blend-multiply" />
            </Link>
          </div>
        );
      })}

      {count > 1 && (
        <>
          <div className="absolute bottom-5 left-6 z-10 flex gap-2 sm:left-10 lg:left-14">
            {slides.map((s, i) => (
              <button
                key={s.key}
                onClick={() => go(i)}
                className={cn("h-2.5 rounded-full transition-all", i === index ? "w-7 bg-brand-400" : "w-2.5 bg-slate-400/60 hover:bg-slate-400")}
                aria-label={`Show slide ${i + 1}: ${s.eyebrow}`}
                aria-current={i === index}
              />
            ))}
          </div>
          <button
            onClick={() => go(index - 1)}
            className="absolute top-1/2 left-3 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-md transition hover:bg-white sm:flex"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => go(index + 1)}
            className="absolute top-1/2 right-3 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-md transition hover:bg-white sm:flex"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
