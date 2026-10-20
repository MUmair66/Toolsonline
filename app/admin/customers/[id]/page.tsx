import { requirePerm } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, formatPrice } from "@/lib/utils";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { CustomerForm } from "@/components/admin/Forms";

export const metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePerm("customers");
  const { id } = await params;
  const [user, settings] = await Promise.all([
    db.user.findUnique({ where: { id }, include: { orders: { orderBy: { createdAt: "desc" } }, _count: { select: { reviews: true } } } }),
    getSettings(),
  ]);
  if (!user) notFound();
  const fmt = (n: number) => formatPrice(n, settings.currency);
  const spent = user.orders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.total, 0);

  return (
    <div>
      <PageHeader title={user.name} description={`Customer since ${formatDate(user.createdAt)}`} />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-5"><p className="text-sm text-slate-500">Orders</p><p className="mt-1 text-2xl font-bold">{user.orders.length}</p></div>
            <div className="card p-5"><p className="text-sm text-slate-500">Total spent</p><p className="mt-1 text-2xl font-bold">{fmt(spent)}</p></div>
            <div className="card p-5"><p className="text-sm text-slate-500">Reviews</p><p className="mt-1 text-2xl font-bold">{user._count.reviews}</p></div>
          </div>
          <div className="card overflow-x-auto">
            <h2 className="p-5 font-semibold">Order history</h2>
            <table className="table-base">
              <thead><tr><th>Order</th><th>Date</th><th>Status</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {user.orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td><Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold text-brand-600 hover:underline">{o.orderNumber}</Link></td>
                    <td className="text-slate-500">{formatDate(o.createdAt)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="text-right font-semibold">{fmt(o.total)}</td>
                  </tr>
                ))}
                {!user.orders.length && <tr><td colSpan={4} className="!py-8 text-center text-slate-500">No orders yet</td></tr>}
              </tbody>
            </table>
          </div>
          {(user.address || user.city) && (
            <div className="card p-5 text-sm">
              <h2 className="font-semibold">Saved address</h2>
              <p className="mt-2 text-slate-600">{user.address}<br />{user.city} {user.postalCode}<br />{user.country}</p>
            </div>
          )}
        </div>
        <div>
          <CustomerForm customer={user} />
        </div>
      </div>
    </div>
  );
}
