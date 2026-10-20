import { requirePerm } from "@/lib/auth";
import Link from "next/link";
import { Pencil, Power, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { deleteCoupon, toggleCoupon } from "@/actions/admin";
import { EmptyRow, PageHeader } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

export const metadata = { title: "Coupons" };

export default async function AdminCoupons() {
  await requirePerm("coupons");
  const [coupons, settings] = await Promise.all([db.coupon.findMany({ orderBy: { createdAt: "desc" } }), getSettings()]);
  const now = new Date();
  return (
    <div>
      <PageHeader title="Coupons" description="Create discount codes for your customers." action={{ href: "/admin/coupons/new", label: "Create coupon" }} />
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Code</th><th>Discount</th><th>Min. order</th><th>Usage</th><th>Expires</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {coupons.map((c) => {
              const expired = c.expiresAt && c.expiresAt < now;
              const exhausted = c.maxUses != null && c.usedCount >= c.maxUses;
              const status = !c.active ? "Inactive" : expired ? "Expired" : exhausted ? "Used up" : "Active";
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td><Link href={`/admin/coupons/${c.id}`} className="rounded bg-slate-100 px-2 py-1 font-mono text-sm font-bold hover:bg-brand-50 hover:text-brand-700">{c.code}</Link></td>
                  <td className="font-semibold">{c.type === "PERCENT" ? `${c.value}%` : formatPrice(c.value, settings.currency)}</td>
                  <td>{c.minOrder ? formatPrice(c.minOrder, settings.currency) : "—"}</td>
                  <td>{c.usedCount}{c.maxUses != null && ` / ${c.maxUses}`}</td>
                  <td className="whitespace-nowrap text-slate-500">{c.expiresAt ? formatDate(c.expiresAt) : "Never"}</td>
                  <td>
                    <span className={cn("badge", status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600")}>{status}</span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <ConfirmButton action={toggleCoupon.bind(null, c.id)} className="btn-ghost !p-2" title={c.active ? "Deactivate" : "Activate"}>
                        <Power className="h-4 w-4" />
                      </ConfirmButton>
                      <Link href={`/admin/coupons/${c.id}`} className="btn-ghost !p-2" title="Edit"><Pencil className="h-4 w-4" /></Link>
                      <ConfirmButton action={deleteCoupon.bind(null, c.id)} message={`Delete coupon ${c.code}?`} className="btn-ghost !p-2 text-red-600 hover:!bg-red-50" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </ConfirmButton>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!coupons.length && <EmptyRow cols={7} text="No coupons yet." />}
          </tbody>
        </table>
      </div>
    </div>
  );
}
