import Link from "next/link";
import { Ban, CircleCheck, Crown, Pencil, ShieldOff, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { parsePermissions, PERMISSIONS, ROLES } from "@/lib/permissions";
import { cn, formatDate } from "@/lib/utils";
import { removeTeamMember, revokeAccess, toggleUserActive } from "@/actions/admin";
import { PageHeader } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

export const metadata = { title: "Team & access" };

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const me = await requirePerm("team");
  const { saved } = await searchParams;
  const team = await db.user.findMany({ where: { role: { in: ["ADMIN", "STAFF"] } }, orderBy: [{ role: "asc" }, { createdAt: "asc" }] });
  const admins = team.filter((t) => t.role === "ADMIN").length;
  const label = (k: string) => PERMISSIONS.find((p) => p.key === k)?.label ?? k;

  return (
    <div>
      <PageHeader
        title="Team & access"
        description="Control who can access the dashboard and what each person can do."
        action={{ href: "/admin/team/new", label: "Add team member" }}
      />
      {saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Team member saved.</p>}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-4"><p className="text-xs text-slate-500">Team members</p><p className="mt-1 text-xl font-bold">{team.length}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">Super admins</p><p className="mt-1 text-xl font-bold">{admins}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">Staff</p><p className="mt-1 text-xl font-bold">{team.length - admins}</p></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {team.map((u) => {
          const self = u.id === me.id;
          const perms = parsePermissions(u.permissions);
          const canManage = !self && (me.role === "ADMIN" || u.role !== "ADMIN");
          return (
            <div key={u.id} className={cn("card p-5", !u.active && "opacity-60")}>
              <div className="flex items-start gap-4">
                <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold", u.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-sky-100 text-sky-700")}>
                  {u.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{u.name}</p>
                    {self && <span className="text-xs text-slate-400">(you)</span>}
                    <span className={cn("badge", u.role === "ADMIN" ? "bg-purple-100 text-purple-800" : "bg-sky-100 text-sky-800")}>
                      {u.role === "ADMIN" && <Crown className="mr-1 h-3 w-3" />}
                      {ROLES[u.role as keyof typeof ROLES]}
                    </span>
                    {!u.active && <span className="badge bg-red-100 text-red-700">Suspended</span>}
                  </div>
                  <p className="truncate text-sm text-slate-500">{u.email}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Added {formatDate(u.createdAt)} · Last login {u.lastLoginAt ? formatDate(u.lastLoginAt) : "never"}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {u.role === "ADMIN" ? (
                  <span className="badge bg-slate-100 text-slate-700">All permissions</span>
                ) : perms.length ? (
                  perms.map((p) => <span key={p} className="badge bg-slate-100 text-slate-700">{label(p)}</span>)
                ) : (
                  <span className="text-xs text-slate-400">No permissions — dashboard only</span>
                )}
              </div>
              {canManage && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Link href={`/admin/team/${u.id}`} className="btn-secondary !px-3 !py-1.5 !text-xs"><Pencil className="h-3.5 w-3.5" /> Edit access</Link>
                  <ConfirmButton
                    action={toggleUserActive.bind(null, u.id)}
                    message={u.active ? `Suspend ${u.name}? They'll be signed out and blocked from logging in.` : undefined}
                    className="btn-secondary !px-3 !py-1.5 !text-xs"
                  >
                    {u.active ? <><Ban className="h-3.5 w-3.5" /> Suspend</> : <><CircleCheck className="h-3.5 w-3.5" /> Re-activate</>}
                  </ConfirmButton>
                  <ConfirmButton
                    action={revokeAccess.bind(null, u.id)}
                    message={`Remove dashboard access for ${u.name}? Their account stays as a regular customer.`}
                    className="btn-secondary !px-3 !py-1.5 !text-xs"
                  >
                    <ShieldOff className="h-3.5 w-3.5" /> Revoke access
                  </ConfirmButton>
                  {me.role === "ADMIN" && (
                    <ConfirmButton
                      action={removeTeamMember.bind(null, u.id)}
                      message={`Permanently delete ${u.name}'s account?`}
                      className="btn-ghost !px-3 !py-1.5 !text-xs text-red-600 hover:!bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </ConfirmButton>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card mt-8 overflow-x-auto">
        <h2 className="p-5 font-semibold">Permission matrix</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>Section</th>
              {team.map((u) => <th key={u.id} className="text-center whitespace-nowrap">{u.name.split(" ")[0]}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p.key}>
                <td className="font-medium">{p.label}</td>
                {team.map((u) => {
                  const has = u.role === "ADMIN" || parsePermissions(u.permissions).includes(p.key);
                  return <td key={u.id} className="text-center">{has ? <span className="text-emerald-600">✓</span> : <span className="text-slate-300">—</span>}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
