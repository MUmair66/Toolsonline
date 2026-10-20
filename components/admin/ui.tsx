import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { cn, statusColor } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {action && (
          <Link href={action.href} className="btn-primary">
            <Plus className="h-4 w-4" /> {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}

export function ExportLink({ type, label = "Export CSV" }: { type: string; label?: string }) {
  return (
    <a href={`/api/admin/export/${type}`} className="btn-secondary" download>
      <Download className="h-4 w-4" /> {label}
    </a>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={cn("badge", statusColor(status))}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
}

export function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="!py-12 text-center text-slate-500">
        {text}
      </td>
    </tr>
  );
}

export { FilterBar } from "./FilterBar";
