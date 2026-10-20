import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/admin/ui";
import { AutomationsForm } from "@/components/admin/Forms";
import { AutomationRunner } from "@/components/admin/AutomationRunner";

export const metadata = { title: "Automations" };

export default async function AutomationsPage() {
  await requirePerm("settings");
  const s = await getSettings();
  const now = new Date();
  const cutoff = new Date(Date.now() - s.staleOrderDays * 86400000);
  const [oos, oosFeatured, coupons, stale, deliveredUnpaid] = await Promise.all([
    db.product.count({ where: { stock: { lte: 0 }, active: true } }),
    db.product.count({ where: { stock: { lte: 0 }, featured: true } }),
    db.coupon.findMany({ where: { active: true } }),
    db.order.count({ where: { status: "PENDING", paymentStatus: "PENDING", createdAt: { lt: cutoff } } }),
    db.order.count({ where: { status: "DELIVERED", paymentStatus: "PENDING" } }),
  ]);
  const deadCoupons = coupons.filter((c) => (c.expiresAt && c.expiresAt < now) || (c.maxUses != null && c.usedCount >= c.maxUses)).length;

  const tasks = [
    { task: "hide_out_of_stock" as const, title: "Hide out-of-stock products", desc: "Unpublish every product with zero stock.", count: oos, unit: "product" },
    { task: "unfeature_out_of_stock" as const, title: "Un-feature sold-out products", desc: "Keep the homepage fresh by removing sold-out items from Featured.", count: oosFeatured, unit: "product" },
    { task: "expire_coupons" as const, title: "Clean up coupons", desc: "Deactivate coupons that expired or hit their usage limit.", count: deadCoupons, unit: "coupon" },
    { task: "cancel_stale" as const, title: "Cancel stale unpaid orders", desc: `Cancel pending, unpaid orders older than ${s.staleOrderDays} days and restock their items.`, count: stale, unit: "order", danger: true },
    { task: "paid_delivered" as const, title: "Settle delivered orders", desc: "Mark delivered orders that are still unpaid as Paid.", count: deliveredUnpaid, unit: "order" },
  ];

  return (
    <div>
      <PageHeader title="Automations" description="Let the store run itself: automatic rules plus one-click maintenance tasks." />
      <div className="grid gap-6 xl:grid-cols-2">
        <AutomationsForm s={s} />
        <div className="card p-6">
          <h2 className="mb-1 font-semibold">One-click tasks</h2>
          <p className="mb-4 text-sm text-slate-500">Each task shows how many items it will affect right now. Every run is recorded in the activity log.</p>
          <div className="space-y-3">
            {tasks.map((t) => (
              <AutomationRunner key={t.task} {...t} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
