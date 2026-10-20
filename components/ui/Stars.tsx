import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(cls, i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200")}
        />
      ))}
    </div>
  );
}
