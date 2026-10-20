"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";

/** Live filter bar: selects apply instantly, search applies as you type (debounced). */
export function FilterBar({ q, placeholder, children }: { q?: string; placeholder: string; children?: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const apply = () => {
    const form = ref.current;
    if (!form) return;
    const sp = new URLSearchParams();
    new FormData(form).forEach((v, k) => {
      if (String(v).trim()) sp.set(k, String(v).trim());
    });
    start(() => router.replace(sp.toString() ? `${pathname}?${sp}` : pathname, { scroll: false }));
  };

  return (
    <form
      ref={ref}
      className="mb-4 flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      onChange={(e) => {
        const t = e.target as HTMLElement;
        if (t.tagName === "SELECT" || ["checkbox", "date"].includes((t as HTMLInputElement).type)) apply();
      }}
    >
      <div className="relative w-full sm:w-80">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          className="input pr-9 pl-9"
          onInput={() => {
            clearTimeout(timer.current);
            timer.current = setTimeout(apply, 350);
          }}
        />
        {pending ? (
          <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        ) : q ? (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            onClick={() => {
              const input = ref.current?.elements.namedItem("q") as HTMLInputElement;
              input.value = "";
              apply();
            }}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {children}
      <button
        type="button"
        className="text-sm font-medium text-slate-500 hover:text-slate-900"
        onClick={() => start(() => router.replace(pathname, { scroll: false }))}
      >
        Reset
      </button>
    </form>
  );
}
