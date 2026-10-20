import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { ChevronRight, Package, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { cn, formatDate, formatPrice, parseImages, statusColor } from "@/lib/utils";
import { SafeImage } from "@/components/ui/SafeImage";
import { ReorderButton } from "@/components/account/AccountWidgets";
import { OrderProgress } from "@/components/account/OrderProgress";

export const metadata: Metadata = { title: "My orders" };

const TABS = [
  { key: "", label: "All" },
  { key: "active", label: "In progress" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "CANCELLED", label: "Cancelled" },
];

export default async function MyOrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const { tab = "", q } = await searchParams;
  const user = await requireUser();
  const settings = await getSettings();
  const fmt = (n: number) => formatPrice(n, settings.currency);

  const where: Prisma.OrderWhereInput = { userId: user.id };
  if (tab === "active") where.status = { in: ["PENDING", "PROCESSING", "SHIPPED"] };
  else if (tab) where.status = tab;
  if (q) where.OR = [{ orderNumber: { contains: q, mode: "insensitive" } }, { items: { some: { name: { contains: q, mode: "insensitive" } } } }];

  const [orders, counts] = await Promise.all([
    db.order.findMany({
      where,
      include: { items: { include: { product: { select: { id: true, slug: true, price: true, stock: true, images: true, active: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
    db.order.groupBy({ by: ["status"], where: { userId: user.id }, _count: { _all: true } }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const tabCount: Record<string, number> = {
    "": counts.reduce((s, c) => s + c._count._all, 0),
    active: count("PENDING") + count("PROCESSING") + count("SHIPPED"),
    DELIVERED: count("DELIVERED"),
    CANCELLED: count("CANCELLED"),
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My orders</h1>
        <p className="mt-1 text-sm text-slate-500">Track, manage and re-order your purchases.</p>
      </div>

      <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 p-2">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/account/orders${t.key ? `?tab=${t.key}` : ""}`}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition",
                tab === t.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {t.label}
              <span className={cn("rounded-md px-1.5 text-xs", tab === t.key ? "bg-white/20" : "bg-slate-100")}>{tabCount[t.key]}</span>
            </Link>
          ))}
        </div>
        <form className="relative w-full sm:w-64">
          {tab && <input type="hidden" name="tab" value={tab} />}
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={q} placeholder="Order # or product…" className="input !py-2 pl-9" />
        </form>
      </div>

      <div className="space-y-4">
        {orders.map((o) => {
          const reorder = o.items
            .filter((i) => i.product?.active)
            .map((i) => ({
              productId: i.product!.id,
              slug: i.product!.slug,
              name: i.name,
              price: i.product!.price,
              image: parseImages(i.product!.images)[0] ?? i.image ?? "",
              stock: i.product!.stock,
              quantity: i.quantity,
            }));
          return (
            <div key={o.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-sm">
                <div><p className="text-xs text-slate-400">Order</p><p className="font-mono font-semibold">{o.orderNumber}</p></div>
                <div><p className="text-xs text-slate-400">Placed</p><p className="font-medium">{formatDate(o.createdAt)}</p></div>
                <div><p className="text-xs text-slate-400">Total</p><p className="font-semibold">{fmt(o.total)}</p></div>
                <div><p className="text-xs text-slate-400">Payment</p><p className="font-medium">{o.paymentMethod === "COD" ? "Cash on delivery" : "Card"}</p></div>
                <span className={cn("badge ml-auto capitalize", statusColor(o.status))}>{o.status.toLowerCase()}</span>
              </div>
              <div className="grid gap-6 p-5 md:grid-cols-5">
                <ul className="space-y-3 md:col-span-3">
                  {o.items.slice(0, 3).map((i) => (
                    <li key={i.id} className="flex items-center gap-3">
                      <SafeImage src={i.image} alt={i.name} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        {i.product ? (
                          <Link href={`/products/${i.product.slug}`} className="line-clamp-1 text-sm font-medium hover:text-brand-600">{i.name}</Link>
                        ) : (
                          <p className="line-clamp-1 text-sm font-medium">{i.name}</p>
                        )}
                        <p className="text-xs text-slate-500">Qty {i.quantity} · {fmt(i.price)}</p>
                      </div>
                    </li>
                  ))}
                  {o.items.length > 3 && <li className="text-xs text-slate-500">+ {o.items.length - 3} more item(s)</li>}
                </ul>
                <div className="flex flex-col justify-between gap-4 md:col-span-2">
                  <OrderProgress status={o.status} compact />
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/account/orders/${o.id}`} className="btn-primary flex-1 !py-2">
                      Details <ChevronRight className="h-4 w-4" />
                    </Link>
                    <ReorderButton items={reorder} className="flex-1 !py-2" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {!orders.length && (
          <div className="card flex flex-col items-center px-6 py-16 text-center">
            <Package className="h-12 w-12 text-slate-300" />
            <p className="mt-4 font-semibold">{q || tab ? "No orders match" : "You haven't ordered anything yet"}</p>
            <p className="mt-1 text-sm text-slate-500">{q || tab ? "Try another tab or search." : "Your orders will appear here."}</p>
            <Link href="/products" className="btn-primary mt-5">Browse products</Link>
          </div>
        )}
      </div>
    </div>
  );
}
