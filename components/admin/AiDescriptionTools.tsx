"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles, Undo2 } from "lucide-react";
import { aiProductCopy } from "@/actions/ai";
import type { CopyMode } from "@/lib/ai-prompts";
import { cn } from "@/lib/utils";

const ACTIONS: { mode: CopyMode; label: string; title: string }[] = [
  { mode: "write", label: "Write", title: "Write a new description from the name, brand and category (keeps any specs already in the box)" },
  { mode: "improve", label: "Improve", title: "Make the current description clearer and better written" },
  { mode: "seo", label: "SEO", title: "Optimise for Google search" },
  { mode: "shorter", label: "Shorter", title: "Make it shorter and punchier" },
];

/** Reads the product name and the selected brand/category text from the surrounding form. */
function readForm(el: HTMLElement | null) {
  const form = el?.closest("form");
  const val = (n: string) => (form?.elements.namedItem(n) as HTMLInputElement | null)?.value ?? "";
  const selected = (n: string) => {
    const s = form?.elements.namedItem(n) as HTMLSelectElement | null;
    return s && s.value ? s.options[s.selectedIndex]?.text ?? "" : "";
  };
  return { name: val("name"), brand: selected("brandId"), category: selected("categoryId") };
}

/**
 * Description textarea with Gemini helpers. The textarea keeps name="description",
 * so the normal product form submits whatever is in it.
 */
export function AiDescriptionField({ defaultValue = "" }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [previous, setPrevious] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState<CopyMode | null>(null);
  const [, start] = useTransition();

  const run = (mode: CopyMode, target: HTMLElement) => {
    setError("");
    setRunning(mode);
    start(async () => {
      const res = await aiProductCopy({ mode, ...readForm(target), description: value });
      setRunning(null);
      if ("error" in res) return setError(res.error);
      setPrevious(value);
      setValue(res.text);
    });
  };

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <label className="label !mb-0" htmlFor="description">Description</label>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-xs font-semibold text-violet-700">
            <Sparkles className="h-3.5 w-3.5" /> AI
          </span>
          {ACTIONS.map((a) => (
            <button
              key={a.mode}
              type="button"
              title={a.title}
              disabled={!!running}
              onClick={(e) => run(a.mode, e.currentTarget)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed",
                running === a.mode ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700 disabled:opacity-50"
              )}
            >
              {running === a.mode && <Loader2 className="h-3 w-3 animate-spin" />}
              {a.label}
            </button>
          ))}
          {previous !== null && !running && (
            <button
              type="button"
              onClick={() => {
                setValue(previous);
                setPrevious(null);
              }}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              title="Restore the text from before the last AI change"
            >
              <Undo2 className="h-3 w-3" /> Undo
            </button>
          )}
        </div>
      </div>
      <textarea
        id="description"
        name="description"
        rows={9}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn("input", running && "animate-pulse")}
        readOnly={!!running}
      />
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-slate-500">
          Specs go on their own lines as <code>• Name: Value</code>; the store shows them as a spec list. AI never adds specs you didn&apos;t give it. Always check the text before saving.
        </p>
      )}
    </div>
  );
}
