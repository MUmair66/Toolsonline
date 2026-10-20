import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  basePath,
  params,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <Link
        href={href(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={cn("rounded-lg p-2 hover:bg-slate-100", page === 1 && "pointer-events-none opacity-40")}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-slate-400">…</span>}
          <Link
            href={href(p)}
            className={cn(
              "flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium",
              p === page ? "bg-brand-600 text-white" : "hover:bg-slate-100"
            )}
          >
            {p}
          </Link>
        </span>
      ))}
      <Link
        href={href(Math.min(totalPages, page + 1))}
        aria-disabled={page === totalPages}
        className={cn("rounded-lg p-2 hover:bg-slate-100", page === totalPages && "pointer-events-none opacity-40")}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  );
}
