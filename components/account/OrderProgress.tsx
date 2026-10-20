import { Check, Clock, Package, Truck, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "PENDING", label: "Placed", icon: Clock },
  { key: "PROCESSING", label: "Processing", icon: Package },
  { key: "SHIPPED", label: "Shipped", icon: Truck },
  { key: "DELIVERED", label: "Delivered", icon: Home },
];

export function OrderProgress({ status, compact }: { status: string; compact?: boolean }) {
  if (status === "CANCELLED") return <p className="text-sm font-medium text-red-600">This order was cancelled.</p>;
  const idx = STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="flex items-start">
      {STEPS.map((s, i) => {
        const done = i <= idx;
        return (
          <li key={s.key} className={cn("relative flex flex-col items-center", i < STEPS.length - 1 && "flex-1")}>
            {i < STEPS.length - 1 && (
              <span className={cn("absolute top-4 left-1/2 h-0.5 w-full", i < idx ? "bg-brand-600" : "bg-slate-200", compact && "top-3")} />
            )}
            <span
              className={cn(
                "relative z-10 flex items-center justify-center rounded-full ring-4 ring-white transition",
                compact ? "h-6 w-6" : "h-8 w-8",
                done ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400"
              )}
            >
              {i < idx || status === "DELIVERED" ? <Check className={compact ? "h-3 w-3" : "h-4 w-4"} /> : <s.icon className={compact ? "h-3 w-3" : "h-4 w-4"} />}
            </span>
            <span className={cn("mt-2 text-xs font-medium", done ? "text-slate-900" : "text-slate-400")}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
