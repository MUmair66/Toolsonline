import type { Prisma } from "@prisma/client";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { clearActivityLog } from "@/actions/admin";
import { FilterBar, PageHeader } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Pagination } from "@/components/ui/Pagination";

export const metadata = { title: "Activity log" };
const PER_PAGE = 30;

const ACTION_STYLE: Record<string, string> = {
  created: "bg-emerald-100 text-emerald-800",
  updated: "bg-blue-100 text-blue-800",
  deleted: "bg-red-100 text-red-700",
  bulk: "bg-purple-100 text-purple-800",
  import: "bg-indigo-100 text-indigo-800",
  export: "bg-slate-200 text-slate-700",
  automation: "bg-amber-100 text-amber-800",
  login: "bg-sky-100 text-sky-800",
};

type SP = { q?: string; user?: string; action?: string; entity?: string; page?: string };

export default async function ActivityPage({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await requirePerm("activity");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ActivityLogWhereInput = {};
  if (sp.q) where.details = { contains: sp.q, mode: "insensitive" };
  if (sp.user) where.userName = sp.user;
  if (sp.action) where.action = sp.action;
  if (sp.entity) where.entity = sp.entity;

  const [total, logs, users, entities] = await Promise.all([
    db.activityLog.count({ where }),
    db.activityLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    db.activityLog.findMany({ distinct: ["userName"], select: { userName: true } }),
    db.activityLog.findMany({ distinct: ["entity"], select: { entity: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Activity log" description="A complete audit trail of every change made in the dashboard.">
        {me.role === "ADMIN" && (
          <ConfirmButton action={clearActivityLog.bind(null, 90)} message="Delete log entries older than 90 days?" className="btn-secondary">
            <Trash2 className="h-4 w-4" /> Clear entries older than 90 days
          </ConfirmButton>
        )}
      </PageHeader>
      <FilterBar q={sp.q} placeholder="Search activity…">
        <select name="user" defaultValue={sp.user ?? ""} className="input !w-auto">
          <option value="">All people</option>
          {users.map((u) => <option key={u.userName} value={u.userName}>{u.userName}</option>)}
        </select>
        <select name="action" defaultValue={sp.action ?? ""} className="input !w-auto">
          <option value="">All actions</option>
          {Object.keys(ACTION_STYLE).map((a) => <option key={a} value={a} className="capitalize">{a}</option>)}
        </select>
        <select name="entity" defaultValue={sp.entity ?? ""} className="input !w-auto">
          <option value="">All areas</option>
          {entities.map((e) => <option key={e.entity} value={e.entity} className="capitalize">{e.entity}</option>)}
        </select>
      </FilterBar>

      <div className="card divide-y divide-slate-100">
        {logs.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{l.userName.charAt(0)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-semibold">{l.userName}</span> <span className="text-slate-600">{l.details}</span>
              </p>
              <p className="text-xs text-slate-400">{new Date(l.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "medium" })}</p>
            </div>
            <span className="badge bg-slate-100 text-slate-600 capitalize">{l.entity}</span>
            <span className={cn("badge capitalize", ACTION_STYLE[l.action] ?? "bg-slate-100 text-slate-700")}>{l.action}</span>
          </div>
        ))}
        {!logs.length && <p className="p-12 text-center text-sm text-slate-500">No activity recorded yet.</p>}
      </div>
      <div className="mt-6">
        <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} basePath="/admin/activity" params={sp} />
      </div>
    </div>
  );
}
