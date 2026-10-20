import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Ban, CircleCheck, Pencil, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { ROLES } from "@/lib/permissions";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { bulkCustomers, deleteCustomer, toggleUserActive } from "@/actions/admin";
import { EmptyRow, ExportLink, FilterBar, PageHeader } from "@/components/admin/ui";
import { BulkForm, RowCheck, SelectAll, type BulkOp } from "@/components/admin/BulkBar";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Pagination } from "@/components/ui/Pagination";

export const metadata = { title: "Customers" };
const PER_PAGE = 20;

type SP = { q?: string; role?: string; status?: string; sort?: string; page?: string };

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await requirePerm("customers");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.UserWhereInput = {};
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q, mode: "insensitive" } }];
  if (sp.role) where.role = sp.role;
  if (sp.status === "active") where.active = true;
  if (sp.status === "suspended") where.active = false;

  const orderBy: Prisma.UserOrderByWithRelationInput =
    sp.sort === "name" ? { name: "asc" } : sp.sort === "oldest" ? { createdAt: "asc" } : sp.sort === "login" ? { lastLoginAt: "desc" } : { createdAt: "desc" };

  const [settings, total, users, suspended] = await Promise.all([
    getSettings(),
    db.user.count({ where }),
    db.user.findMany({ where, orderBy, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    db.user.count({ where: { active: false } }),
  ]);
  const spend = await db.order.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((u) => u.id) }, status: { not: "CANCELLED" } },
    _sum: { total: true },
    _count: { _all: true },
  });

  const ops: BulkOp[] = [
    { value: "suspend", label: "Suspend (block login)" },
    { value: "activate", label: "Re-activate" },
    { value: "delete", label: "Delete permanently", danger: true },
  ];

  return (
    <div>
      <PageHeader title="Customers" description={`${total} users${suspended ? ` · ${suspended} suspended` : ""}`} action={{ href: "/admin/customers/new", label: "Add customer" }}>
        <ExportLink type="customers" />
      </PageHeader>
      <FilterBar q={sp.q} placeholder="Search name, email or phone…">
        <select name="role" defaultValue={sp.role ?? ""} className="input !w-auto">
          <option value="">All roles</option>
          <option value="CUSTOMER">Customers</option>
          <option value="STAFF">Staff</option>
          <option value="ADMIN">Super admins</option>
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className="input !w-auto">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <select name="sort" defaultValue={sp.sort ?? ""} className="input !w-auto">
          <option value="">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="name">Name A–Z</option>
          <option value="login">Recently active</option>
        </select>
      </FilterBar>

      <BulkForm id="bulk-customers" action={bulkCustomers} ops={ops} noun="customer" />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th className="w-10"><SelectAll form="bulk-customers" /></th>
              <th>User</th><th>Role</th><th>Status</th><th>Orders</th><th>Total spent</th><th>Last login</th><th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const s = spend.find((x) => x.userId === u.id);
              const self = u.id === me.id;
              return (
                <tr key={u.id} className={cn("hover:bg-slate-50", !u.active && "bg-red-50/40")}>
                  <td>{!self && u.role === "CUSTOMER" && <RowCheck form="bulk-customers" value={u.id} label={`Select ${u.name}`} />}</td>
                  <td>
                    <Link href={`/admin/customers/${u.id}`} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{u.name.charAt(0).toUpperCase()}</span>
                      <span>
                        <span className="block font-semibold hover:text-brand-600">{u.name}{self && <span className="ml-1 text-xs text-slate-400">(you)</span>}</span>
                        <span className="text-xs text-slate-500">{u.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <span className={cn("badge", u.role === "ADMIN" ? "bg-purple-100 text-purple-800" : u.role === "STAFF" ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-700")}>
                      {ROLES[u.role as keyof typeof ROLES] ?? u.role}
                    </span>
                  </td>
                  <td><span className={cn("badge", u.active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700")}>{u.active ? "Active" : "Suspended"}</span></td>
                  <td>{s?._count._all ?? 0}</td>
                  <td className="font-semibold">{formatPrice(s?._sum.total ?? 0, settings.currency)}</td>
                  <td className="whitespace-nowrap text-slate-500">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/customers/${u.id}`} className="btn-ghost !p-2" title="View / edit"><Pencil className="h-4 w-4" /></Link>
                      {!self && (u.role === "CUSTOMER" || me.role === "ADMIN") && (
                        <>
                          <ConfirmButton
                            action={toggleUserActive.bind(null, u.id)}
                            message={u.active ? `Suspend ${u.name}? They won't be able to log in.` : undefined}
                            className={cn("btn-ghost !p-2", u.active ? "text-amber-600" : "text-emerald-600")}
                            title={u.active ? "Suspend" : "Re-activate"}
                          >
                            {u.active ? <Ban className="h-4 w-4" /> : <CircleCheck className="h-4 w-4" />}
                          </ConfirmButton>
                          <ConfirmButton
                            action={deleteCustomer.bind(null, u.id)}
                            message={`Delete ${u.name}? Their orders will be kept as guest orders.`}
                            className="btn-ghost !p-2 text-red-600 hover:!bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </ConfirmButton>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!users.length && <EmptyRow cols={8} text="No users match these filters." />}
          </tbody>
        </table>
      </div>
      <div className="mt-6">
        <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} basePath="/admin/customers" params={sp} />
      </div>
    </div>
  );
}
