"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import { LayoutGrid, List, Loader2, Search, SlidersHorizontal, Star, X } from "lucide-react";
import { usePrice } from "@/components/providers/StoreProvider";
import { cn } from "@/lib/utils";

/* ---------------- shared filter state ---------------- */

type Ctx = { pending: boolean; update: (u: Record<string, string | null>) => void };
const FilterCtx = createContext<Ctx | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const update = (updates: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    if (!("page" in updates)) sp.delete("page");
    const qs = sp.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  return <FilterCtx.Provider value={{ pending, update }}>{children}</FilterCtx.Provider>;
}

function useFilters() {
  const ctx = useContext(FilterCtx);
  if (!ctx) throw new Error("Wrap in <FilterProvider>");
  return ctx;
}

/** Dims results and shows a spinner while new results load. */
export function ResultsShell({ children }: { children: React.ReactNode }) {
  const { pending } = useFilters();
  return (
    <div className="relative">
      {pending && (
        <div className="absolute inset-x-0 top-10 z-10 flex justify-center">
          <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium shadow-lg ring-1 ring-slate-200">
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" /> Updating results…
          </span>
        </div>
      )}
      <div className={cn("transition-opacity duration-200", pending && "pointer-events-none opacity-40")}>{children}</div>
    </div>
  );
}

/* ---------------- toolbar ---------------- */

export function SortSelect() {
  const params = useSearchParams();
  const { update } = useFilters();
  return (
    <select
      value={params.get("sort") || "featured"}
      onChange={(e) => update({ sort: e.target.value === "featured" ? null : e.target.value })}
      className="input !w-auto !py-2"
      aria-label="Sort products"
    >
      <option value="featured">Featured</option>
      <option value="newest">Newest</option>
      <option value="price-asc">Price: Low to High</option>
      <option value="price-desc">Price: High to Low</option>
      <option value="discount">Biggest discount</option>
      <option value="name">Name: A–Z</option>
    </select>
  );
}

export function ViewToggle() {
  const params = useSearchParams();
  const { update } = useFilters();
  const view = params.get("view") === "list" ? "list" : "grid";
  return (
    <div className="flex rounded-lg border border-slate-300 p-0.5">
      {(["grid", "list"] as const).map((v) => (
        <button
          key={v}
          onClick={() => update({ view: v === "grid" ? null : v, page: params.get("page") })}
          className={cn("rounded-md p-1.5", view === v ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")}
          aria-label={`${v} view`}
          aria-pressed={view === v}
        >
          {v === "grid" ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
        </button>
      ))}
    </div>
  );
}

/* ---------------- filter panel ---------------- */

type Cat = { name: string; slug: string; count: number };

function Section({ title, children, onClear }: { title: string; children: React.ReactNode; onClear?: () => void }) {
  return (
    <div className="border-b border-slate-200 pb-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {onClear && (
          <button onClick={onClear} className="text-xs font-medium text-brand-600 hover:underline">Clear</button>
        )}
      </div>
      {children}
    </div>
  );
}

function FilterBody({ categories, maxPrice }: { categories: Cat[]; maxPrice: number }) {
  const params = useSearchParams();
  const { update } = useFilters();
  const fmt = usePrice();
  const [q, setQ] = useState(params.get("q") || "");
  const [min, setMin] = useState(params.get("min") || "");
  const [max, setMax] = useState(params.get("max") || "");
  const selected = (params.get("category") || "").split(",").filter(Boolean);
  const rating = params.get("rating");
  const first = useRef(true);

  // Keep local inputs in sync when the URL changes elsewhere (e.g. "Clear all").
  useEffect(() => {
    setQ(params.get("q") || "");
    setMin(params.get("min") || "");
    setMax(params.get("max") || "");
  }, [params]);

  // Debounced auto-apply for search and price inputs.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      const cur = { q: params.get("q") || "", min: params.get("min") || "", max: params.get("max") || "" };
      if (cur.q !== q.trim() || cur.min !== min || cur.max !== max) update({ q: q.trim() || null, min: min || null, max: max || null });
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, min, max]);

  const toggleCat = (slug: string) => {
    const next = selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug];
    update({ category: next.join(",") || null });
  };

  const step = maxPrice > 500 ? 100 : maxPrice > 100 ? 25 : 10;
  const chips = [
    { label: `Under ${fmt(step)}`, min: "", max: String(step) },
    { label: `${fmt(step)} – ${fmt(step * 4)}`, min: String(step), max: String(step * 4) },
    { label: `${fmt(step * 4)} – ${fmt(step * 10)}`, min: String(step * 4), max: String(step * 10) },
    { label: `Over ${fmt(step * 10)}`, min: String(step * 10), max: "" },
  ];

  return (
    <div className="space-y-6">
      <Section title="Search">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to filter…" className="input !py-2 pl-9" aria-label="Filter by keyword" />
        </div>
      </Section>

      <Section title="Categories" onClear={selected.length ? () => update({ category: null }) : undefined}>
        <ul className="space-y-1">
          {categories.map((c) => (
            <li key={c.slug}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                <input type="checkbox" checked={selected.includes(c.slug)} onChange={() => toggleCat(c.slug)} className="h-4 w-4 rounded accent-brand-600" />
                <span className={cn("flex-1", selected.includes(c.slug) && "font-semibold text-brand-700")}>{c.name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{c.count}</span>
              </label>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Price" onClear={min || max ? () => update({ min: null, max: null }) : undefined}>
        <div className="flex items-center gap-2">
          <input type="number" min={0} placeholder="Min" value={min} onChange={(e) => setMin(e.target.value)} className="input !py-2" aria-label="Minimum price" />
          <span className="text-slate-400">–</span>
          <input type="number" min={0} placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} className="input !py-2" aria-label="Maximum price" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((c) => {
            const on = (params.get("min") || "") === c.min && (params.get("max") || "") === c.max;
            return (
              <button
                key={c.label}
                onClick={() => update(on ? { min: null, max: null } : { min: c.min || null, max: c.max || null })}
                className={cn("rounded-full border px-2.5 py-1 text-xs font-medium transition", on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 hover:border-slate-400")}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Customer rating" onClear={rating ? () => update({ rating: null }) : undefined}>
        <div className="space-y-1">
          {[4, 3, 2].map((r) => (
            <button
              key={r}
              onClick={() => update({ rating: rating === String(r) ? null : String(r) })}
              className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm", rating === String(r) ? "bg-brand-50 font-semibold text-brand-700" : "hover:bg-slate-50")}
            >
              <span className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className={cn("h-4 w-4", i <= r ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200")} />
                ))}
              </span>
              & up
            </button>
          ))}
        </div>
      </Section>

      <Section title="Availability & deals">
        {[
          { key: "instock", label: "In stock only" },
          { key: "sale", label: "On sale" },
          { key: "featured", label: "Featured picks" },
        ].map((t) => (
          <label key={t.key} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
            {t.label}
            <span className="relative inline-flex">
              <input
                type="checkbox"
                checked={params.get(t.key) === "1"}
                onChange={(e) => update({ [t.key]: e.target.checked ? "1" : null })}
                className="peer sr-only"
              />
              <span className="h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-brand-600" />
              <span className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
            </span>
          </label>
        ))}
      </Section>
    </div>
  );
}

export function ProductFilters({ categories, maxPrice, activeCount }: { categories: Cat[]; maxPrice: number; activeCount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-36 max-h-[calc(100vh-10rem)] overflow-y-auto pr-2">
          <FilterBody categories={categories} maxPrice={maxPrice} />
        </div>
      </aside>
      <button onClick={() => setOpen(true)} className="btn-secondary self-start !py-2 lg:hidden">
        <SlidersHorizontal className="h-4 w-4" /> Filters
        {activeCount > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-xs text-white">{activeCount}</span>}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="animate-in absolute inset-y-0 right-0 flex w-80 max-w-[88%] flex-col bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <span className="text-lg font-bold">Filters</span>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close filters">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <FilterBody categories={categories} maxPrice={maxPrice} />
            </div>
            <div className="border-t border-slate-200 p-4">
              <button onClick={() => setOpen(false)} className="btn-primary w-full">Show results</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ActiveFilters({ categoryNames }: { categoryNames: Record<string, string> }) {
  const params = useSearchParams();
  const { update } = useFilters();
  const fmt = usePrice();
  const chips: { label: string; clear: Record<string, string | null> }[] = [];
  if (params.get("q")) chips.push({ label: `"${params.get("q")}"`, clear: { q: null } });
  const cats = (params.get("category") || "").split(",").filter(Boolean);
  for (const c of cats) chips.push({ label: categoryNames[c] ?? c, clear: { category: cats.filter((x) => x !== c).join(",") || null } });
  if (params.get("min") || params.get("max"))
    chips.push({
      label: `${params.get("min") ? fmt(Number(params.get("min"))) : "Any"} – ${params.get("max") ? fmt(Number(params.get("max"))) : "Any"}`,
      clear: { min: null, max: null },
    });
  if (params.get("rating")) chips.push({ label: `${params.get("rating")}★ & up`, clear: { rating: null } });
  if (params.get("instock")) chips.push({ label: "In stock", clear: { instock: null } });
  if (params.get("sale")) chips.push({ label: "On sale", clear: { sale: null } });
  if (params.get("featured")) chips.push({ label: "Featured", clear: { featured: null } });
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button key={c.label} onClick={() => update(c.clear)} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100">
          {c.label} <X className="h-3 w-3" />
        </button>
      ))}
      <button
        onClick={() => update({ q: null, category: null, min: null, max: null, rating: null, instock: null, sale: null, featured: null })}
        className="text-xs font-semibold text-slate-500 hover:text-slate-900"
      >
        Clear all
      </button>
    </div>
  );
}
