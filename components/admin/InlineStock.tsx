"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { updateStock } from "@/actions/admin";
import { cn } from "@/lib/utils";

/** Click-to-edit stock cell. Saves on Enter or blur. */
export function InlineStock({ id, stock, low }: { id: string; stock: number; low: number }) {
  const [value, setValue] = useState(String(stock));
  const [saved, setSaved] = useState(stock);
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState(false);

  const save = () => {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    if (n === saved) return setValue(String(saved));
    start(async () => {
      const res = await updateStock(id, n);
      setSaved(res.stock);
      setValue(String(res.stock));
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
    });
  };

  return (
    <div className="relative w-20">
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        className={cn(
          "w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold hover:border-slate-200 focus:border-brand-500 focus:bg-white focus:outline-none",
          saved <= 0 ? "text-red-600" : saved <= low ? "text-amber-600" : "text-slate-900"
        )}
        aria-label="Stock quantity"
        title="Click to edit stock"
      />
      <span className="absolute top-1/2 -right-4 -translate-y-1/2">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" /> : flash ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : null}
      </span>
    </div>
  );
}
