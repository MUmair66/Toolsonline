import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CreditCard,
  DollarSign,
  Download,
  PackagePlus,
  Receipt,
  ShieldAlert,
  ShoppingCart,
  Ticket,
  Upload,
  UserPlus,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { hasPerm } from "@/lib/permissions";
import { cn, formatDate, formatPrice, ORDER_STATUSES, parseImages } from "@/lib/utils";
import { SalesChart } from "@/components/admin/SalesChart";
import { StatusBadge } from "@/components/admin/ui";
import { SafeImage } from "@/components/ui/SafeImage";

export const metadata = { title: "Dashboard" };

const DAY = 86400000;
const RANGES = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "365", label: "12 months" },
];

function pctChange(cur: number, prev: number) {
  if (!prev) return cur ? 100 : 0;
  return ((cur - prev) / prev) * 100;
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ range?: string; denied?: string }> }) {
  const sp = await searchParams;
  const user = await requireStaff();
  const settings = await getSettings();
  const fmt = (n: number) => formatPrice(n, settings.currency);
  const canOrders = hasPerm(user, "orders");
  const days = RANGES.some((r) => r.key === sp.range) ? Number(sp.range) : 30;

  const start = new Date(Date.now() - (days - 1) * DAY);
  start.setHours(0, 0, 0, 0);
  const prevStart = new Date(start.getTime() - days * DAY);
  const valid = { status: { not: "CANCELLED" } };

  const [cur, prev, newCustomers, prevCustomers, recentOrders, lowStock, byStatus, topItems, payments, catItems, activity, totalProducts, outOfStock] =
    await Promise.all([
      db.order.findMany({ where: { ...valid, createdAt: { gte: start } }, select: { total: true, createdAt: true, userId: true } }),
      db.order.aggregate({ where: { ...valid, createdAt: { gte: prevStart, lt: start } }, _sum: { total: true }, _count: true }),
      db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: start } } }),
      db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: prevStart, lt: start } } }),
      db.order.findMany({ orderBy: { createdAt: "desc" }, take: 7 }),
      db.product.findMany({ where: { stock: { lte: settings.lowStockThreshold } }, orderBy: { stock: "asc" }, take: 6 }),
      db.order.groupBy({ by: ["status"], where: { createdAt: { gte: start } }, _count: { _all: true } }),
      db.orderItem.groupBy({
        by: ["productId"],
        where: { productId: { not: null }, order: { ...valid, createdAt: { gte: start } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      db.order.groupBy({ by: ["paymentMethod"], where: { ...valid, createdAt: { gte: start } }, _sum: { total: true }, _count: { _all: true } }),
      db.orderItem.findMany({
        where: { order: { ...valid, createdAt: { gte: start } } },
        select: { price: true, quantity: true, product: { select: { category: { select: { name: true } } } } },
      }),
      hasPerm(user, "activity") ? db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 }) : [],
      db.product.count(),
      db.product.count({ where: { stock: { lte: 0 } } }),
    ]);

  // KPIs
  const revenue = cur.reduce((s, o) => s + o.total, 0);
  const prevRevenue = prev._sum.total ?? 0;
  const aov = cur.length ? revenue / cur.length : 0;
  const prevAov = prev._count ? prevRevenue / prev._count : 0;

  const kpis = [
    { label: "Revenue", value: fmt(revenue), change: pctChange(revenue, prevRevenue), icon: DollarSign },
    { label: "Orders", value: cur.length.toLocaleString(), change: pctChange(cur.length, prev._count), icon: ShoppingCart },
    { label: "Avg. order value", value: fmt(aov), change: pctChange(aov, prevAov), icon: Receipt },
    { label: "New customers", value: newCustomers.toLocaleString(), change: pctChange(newCustomers, prevCustomers), icon: UserPlus },
  ];

  // Chart series: daily up to 90 days, monthly for 12 months
  const monthly = days > 90;
  const buckets: { key: string; date: string; revenue: number; orders: number }[] = [];
  if (monthly) {
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, date: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), revenue: 0, orders: 0 });
    }
  } else {
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * DAY);
      buckets.push({ key: d.toDateString(), date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), revenue: 0, orders: 0 });
    }
  }
  for (const o of cur) {
    const d = new Date(o.createdAt);
    const key = monthly ? `${d.getFullYear()}-${d.getMonth()}` : d.toDateString();
    const b = buckets.find((x) => x.key === key);
    if (b) {
      b.revenue = Math.round((b.revenue + o.total) * 100) / 100;
      b.orders++;
    }
  }

  // Sales by category
  const catTotals = new Map<string, number>();
  for (const i of catItems) {
    const name = i.product?.category?.name ?? "Uncategorized";
    catTotals.set(name, (catTotals.get(name) ?? 0) + i.price * i.quantity);
  }
  const categories = [...catTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const catMax = Math.max(1, ...categories.map((c) => c[1]));

  // Top products & customers
  const topProducts = await db.product.findMany({ where: { id: { in: topItems.map((t) => t.productId!) } } });
  const top = topItems.map((t) => ({ product: topProducts.find((p) => p.id === t.productId), sold: t._sum.quantity ?? 0 })).filter((t) => t.product);
  const spendByUser = new Map<string, number>();
  for (const o of cur) if (o.userId) spendByUser.set(o.userId, (spendByUser.get(o.userId) ?? 0) + o.total);
  const topUserIds = [...spendByUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topUsers = await db.user.findMany({ where: { id: { in: topUserIds.map((t) => t[0]) } }, select: { id: true, name: true, email: true } });

  const statusCounts = ORDER_STATUSES.map((s) => ({ status: s, count: byStatus.find((b) => b.status === s)?._count._all ?? 0 }));
  const statusTotal = Math.max(1, statusCounts.reduce((s, x) => s + x.count, 0));
  const payTotal = Math.max(1, payments.reduce((s, p) => s + (p._sum.total ?? 0), 0));

  const quick = [
    { href: "/admin/products/new", label: "Add product", icon: PackagePlus, show: hasPerm(user, "products") },
    { href: "/admin/products/import", label: "Bulk import", icon: Upload, show: hasPerm(user, "products") },
    { href: "/admin/coupons/new", label: "New coupon", icon: Ticket, show: hasPerm(user, "coupons") },
    { href: "/api/admin/export/orders", label: "Export orders", icon: Download, show: canOrders, download: true },
  ].filter((q) => q.show);

  return (
    <div className="space-y-6">
      {sp.denied && (
        <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="h-4 w-4" /> You don&apos;t have permission to access that section. Ask a super admin to grant it.
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {user.name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-slate-500">Here&apos;s how your store is performing.</p>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/admin?range=${r.key}`}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition", String(days) === r.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{k.label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <k.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight">{k.value}</p>
            <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", k.change >= 0 ? "text-emerald-600" : "text-red-600")}>
              {k.change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(k.change).toFixed(1)}% <span className="font-normal text-slate-400">vs previous {days} days</span>
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="font-semibold">Revenue</h2>
              <p className="text-xs text-slate-500">{monthly ? "Monthly" : "Daily"} revenue · hover for details</p>
            </div>
            <p className="text-lg font-bold">{fmt(revenue)}</p>
          </div>
          <SalesChart data={buckets.map(({ date, revenue, orders }) => ({ date, revenue, orders }))} />
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Sales by category</h2>
          <ul className="mt-5 space-y-4">
            {categories.map(([name, total]) => (
              <li key={name}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-slate-600">{name}</span>
                  <span className="font-semibold">{fmt(total)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${(total / catMax) * 100}%` }} />
                </div>
              </li>
            ))}
            {!categories.length && <li className="text-sm text-slate-500">No sales in this period.</li>}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5">
          <h2 className="font-semibold">Order pipeline</h2>
          <ul className="mt-4 space-y-3">
            {statusCounts.map((s) => (
              <li key={s.status}>
                <Link href={canOrders ? `/admin/orders?status=${s.status}` : "#"} className="flex items-center gap-3 text-sm">
                  <StatusBadge status={s.status} />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-slate-400" style={{ width: `${(s.count / statusTotal) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right font-semibold">{s.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Payment methods</h2>
          <ul className="mt-4 space-y-4">
            {[
              { key: "CARD", label: "Card", icon: CreditCard },
              { key: "COD", label: "Cash on delivery", icon: Banknote },
            ].map((m) => {
              const p = payments.find((x) => x.paymentMethod === m.key);
              const total = p?._sum.total ?? 0;
              return (
                <li key={m.key} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100"><m.icon className="h-4 w-4 text-slate-600" /></span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{m.label}</span>
                      <span className="font-semibold">{Math.round((total / payTotal) * 100)}%</span>
                    </div>
                    <p className="text-xs text-slate-500">{p?._count._all ?? 0} orders · {fmt(total)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-center">
            <div><p className="text-xl font-bold">{totalProducts}</p><p className="text-xs text-slate-500">Products</p></div>
            <div><p className={cn("text-xl font-bold", outOfStock > 0 && "text-red-600")}>{outOfStock}</p><p className="text-xs text-slate-500">Out of stock</p></div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Top customers</h2>
          <ul className="mt-4 space-y-3">
            {topUserIds.map(([id, spent]) => {
              const u = topUsers.find((x) => x.id === id);
              if (!u) return null;
              return (
                <li key={id} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{u.name.charAt(0)}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/customers/${u.id}`} className="block truncate text-sm font-medium hover:text-brand-600">{u.name}</Link>
                    <p className="truncate text-xs text-slate-500">{u.email}</p>
                  </div>
                  <span className="text-sm font-semibold">{fmt(spent)}</span>
                </li>
              );
            })}
            {!topUserIds.length && <li className="text-sm text-slate-500">No customer orders yet.</li>}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Quick actions</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {quick.map((q) => (
              <a
                key={q.href}
                href={q.href}
                className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-3 text-center text-xs font-medium transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
              >
                <q.icon className="h-5 w-5" /> {q.label}
              </a>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">
            Tip: press <kbd className="rounded border border-slate-200 px-1 font-mono">Ctrl K</kbd> to search anything
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {canOrders && (
          <div className="card overflow-hidden xl:col-span-2">
            <div className="flex items-center justify-between p-5">
              <h2 className="font-semibold">Recent orders</h2>
              <Link href="/admin/orders" className="text-sm font-semibold text-brand-600 hover:underline">View all</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th className="text-right">Total</th></tr></thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td><Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold text-brand-600 hover:underline">{o.orderNumber}</Link></td>
                      <td>{o.name}</td>
                      <td className="whitespace-nowrap text-slate-500">{formatDate(o.createdAt)}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="text-right font-semibold">{fmt(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className={cn("space-y-6", !canOrders && "xl:col-span-3 xl:grid xl:grid-cols-3 xl:gap-6 xl:space-y-0")}>
          <div className="card p-5">
            <h2 className="font-semibold">Best sellers</h2>
            <ul className="mt-4 space-y-3">
              {top.map((t, i) => (
                <li key={t.product!.id} className="flex items-center gap-3">
                  <span className="w-4 text-sm font-semibold text-slate-400">{i + 1}</span>
                  <SafeImage src={parseImages(t.product!.images)[0]} alt={t.product!.name} className="h-10 w-10 rounded-lg object-cover" />
                  <span className="line-clamp-1 flex-1 text-sm font-medium">{t.product!.name}</span>
                  <span className="text-sm text-slate-500">{t.sold} sold</span>
                </li>
              ))}
              {!top.length && <li className="text-sm text-slate-500">No sales in this period.</li>}
            </ul>
          </div>
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-amber-500" /> Low stock (≤{settings.lowStockThreshold})</h2>
            <ul className="mt-4 space-y-3">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/admin/products/${p.id}`} className="line-clamp-1 font-medium hover:text-brand-600">{p.name}</Link>
                  <span className={cn("badge", p.stock <= 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800")}>{p.stock <= 0 ? "Out" : `${p.stock} left`}</span>
                </li>
              ))}
              {!lowStock.length && <li className="text-sm text-slate-500">All products are well stocked 🎉</li>}
            </ul>
          </div>
          {activity.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Team activity</h2>
                <Link href="/admin/activity" className="text-xs font-semibold text-brand-600 hover:underline">View all</Link>
              </div>
              <ul className="mt-4 space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="text-sm">
                    <p className="line-clamp-2"><span className="font-semibold">{a.userName}</span> <span className="text-slate-600">{a.details}</span></p>
                    <p className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
