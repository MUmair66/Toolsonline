"use client";

import { useTransition } from "react";
import { Loader2, Play } from "lucide-react";
import { runAutomation, type AutomationTask } from "@/actions/admin";
import { useToast } from "@/components/providers/ToastProvider";
import { cn } from "@/lib/utils";

export function AutomationRunner({
  task,
  title,
  desc,
  count,
  unit,
  danger,
}: {
  task: AutomationTask;
  title: string;
  desc: string;
  count: number;
  unit: string;
  danger?: boolean;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-slate-500">{desc}</p>
        <p className={cn("mt-1 text-xs font-semibold", count ? "text-amber-600" : "text-emerald-600")}>
          {count ? `${count} ${unit}${count === 1 ? "" : "s"} affected` : "Nothing to do ✓"}
        </p>
      </div>
      <button
        disabled={pending || !count}
        onClick={() => {
          if (danger && !confirm(`${title}: this will affect ${count} ${unit}(s). Continue?`)) return;
          start(async () => {
            const res = await runAutomation(task);
            toast(res.message);
          });
        }}
        className={danger ? "btn-danger !py-2" : "btn-primary !py-2"}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run
      </button>
    </div>
  );
}
