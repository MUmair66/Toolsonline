import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { cn, formatDate, formatPrice, ORDER_STATUSES } from "@/lib/utils";
import { bulkOrders } from "@/actions/admin";
import { EmptyRow, ExportLink, FilterBar, PageHeader, StatusBadge } from "@/components/admin/ui";
import { BulkForm, RowCheck, SelectAll, type BulkOp } from "@/components/admin/BulkBar";
import { Pagination } from "@/components/ui/Pagination";

export const metadata = { title: "Orders" };
const PER_PAGE = 20;

type SP = { q?: string; status?: string; payment?: string; method?: string; from?: string; to?: string; sort?: string; page?: string };

export default async function AdminOrders({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePerm("orders");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.OrderWhereInput = {};
  if (sp.q) where.OR = [{ orderNumber: { contains: sp.q, mode: "insensitive" } }, { name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q, mode: "insensitive" } }];
  if (sp.status) where.status = sp.status;
  if (sp.payment) where.paymentStatus = sp.payment;
  if (sp.method) where.paymentMethod = sp.method;
  const created: Prisma.DateTimeFilter = {};
  if (sp.from) created.gte = new Date(sp.from + "T00:00:00");
  if (sp.to) created.lte = new Date(sp.to + "T23:59:59");
  if (Object.keys(created).length) where.createdAt = created;

  const orderBy: Prisma.OrderOrderByWithRelationInput =
    sp.sort === "oldest" ? { createdAt: "asc" } : sp.sort === "total-desc" ? { total: "desc" } : sp.sort === "total-asc" ? { total: "asc" } : { createdAt: "desc" };

  const [settings, total, orders, counts, sum] = await Promise.all([
    getSettings(),
    db.order.count({ where }),
    db.order.findMany({ where, include: { _count: { select: { items: true } } }, orderBy, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
    db.order.aggregate({ where, _sum: { total: true } }),
  ]);
  const all = counts.reduce((s, c) => s + c._count._all, 0);
  const tabHref = (status?: string) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "status" && k !== "page") p.set(k, v);
    if (status) p.set("status", status);
    return `/admin/orders${p.toString() ? `?${p}` : ""}`;
  };

  const ops: BulkOp[] = [
    { value: "PROCESSING", label: "Mark as processing" },
    { value: "SHIPPED", label: "Mark as shipped" },
    { value: "DELIVERED", label: "Mark as delivered" },
    { value: "CANCELLED", label: "Cancel orders (restocks items)" },
    { value: "paid", label: "Mark payment as paid" },
    { value: "delete", label: "Delete permanently", danger: true },
  ];

  return (
    <div>
      <PageHeader title="Orders" description="Process, track and fulfil customer orders.">
        <ExportLink type="orders" />
      </PageHeader>
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
        {[{ key: undefined, label: "All", n: all }, ...ORDER_STATUSES.map((s) => ({ key: s, label: s.charAt(0) + s.slice(1).toLowerCase(), n: counts.find((c) => c.status === s)?._count._all ?? 0 }))].map((t) => (
          <Link
            key={t.label}
            href={tabHref(t.key)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap",
              sp.status === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-900"
            )}
          >
            {t.label} <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{t.n}</span>
          </Link>
        ))}
      </div>
      <FilterBar q={sp.q} placeholder="Order #, name, email or phone…">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <select name="payment" defaultValue={sp.payment ?? ""} className="input !w-auto">
          <option value="">Any payment status</option>
          <option value="PENDING">Payment pending</option>
          <option value="PAID">Paid</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <select name="method" defaultValue={sp.method ?? ""} className="input !w-auto">
          <option value="">Any method</option>
          <option value="CARD">Card</option>
          <option value="COD">Cash on delivery</option>
        </select>
        <input type="date" name="from" defaultValue={sp.from} className="input !w-auto" aria-label="From date" />
        <input type="date" name="to" defaultValue={sp.to} className="input !w-auto" aria-label="To date" />
        <select name="sort" defaultValue={sp.sort ?? ""} className="input !w-auto">
          <option value="">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="total-desc">Highest total</option>
          <option value="total-asc">Lowest total</option>
        </select>
      </FilterBar>

      <BulkForm id="bulk-orders" action={bulkOrders} ops={ops} noun="order" />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th className="w-10"><SelectAll form="bulk-orders" /></th>
              <th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Payment</th><th>Status</th><th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td><RowCheck form="bulk-orders" value={o.id} label={`Select ${o.orderNumber}`} /></td>
                <td><Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold text-brand-600 hover:underline">{o.orderNumber}</Link></td>
                <td className="whitespace-nowrap text-slate-500">{formatDate(o.createdAt)}</td>
                <td>
                  <p className="font-medium">{o.name}</p>
                  <p className="text-xs text-slate-500">{o.email}</p>
                </td>
                <td>{o._count.items}</td>
                <td>
                  <StatusBadge status={o.paymentStatus} />
                  <p className="mt-0.5 text-xs text-slate-400">{o.paymentMethod === "COD" ? "Cash" : "Card"}</p>
                </td>
                <td><StatusBadge status={o.status} /></td>
                <td className="text-right font-semibold">{formatPrice(o.total, settings.currency)}</td>
              </tr>
            ))}
            {!orders.length && <EmptyRow cols={8} text="No orders match these filters." />}
          </tbody>
        </table>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {total} orders · <span className="font-semibold text-slate-900">{formatPrice(sum._sum.total ?? 0, settings.currency)}</span> total value
        </p>
        <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} basePath="/admin/orders" params={sp} />
      </div>
    </div>
  );
}
