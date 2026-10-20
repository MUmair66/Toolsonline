import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gift, MapPin, Package, ShoppingBag, Sparkles, Star, Ticket, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { loyalty, TIERS } from "@/lib/loyalty";
import { visibleWhere, withRatings } from "@/lib/products";
import { cn, formatDate, formatPrice, statusColor } from "@/lib/utils";
import { ProductCard } from "@/components/shop/ProductCard";
import { SafeImage } from "@/components/ui/SafeImage";
import { CopyCode } from "@/components/account/AccountWidgets";
import { OrderProgress } from "@/components/account/OrderProgress";

export const metadata: Metadata = { title: "My account" };

export default async function AccountOverview() {
  const user = await requireUser();
  const settings = await getSettings();
  const fmt = (n: number) => formatPrice(n, settings.currency);
  const base = visibleWhere(settings);

  const [orders, reviewCount, defaultAddress, coupons, purchased] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, include: { items: true }, orderBy: { createdAt: "desc" } }),
    db.review.count({ where: { userId: user.id } }),
    db.address.findFirst({ where: { userId: user.id, isDefault: true } }),
    db.coupon.findMany({ where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { value: "desc" }, take: 3 }),
    db.orderItem.findMany({
      where: { order: { userId: user.id }, productId: { not: null } },
      select: { productId: true, product: { select: { categoryId: true } } },
    }),
  ]);

  const valid = orders.filter((o) => o.status !== "CANCELLED");
  const spent = valid.reduce((s, o) => s + o.total, 0);
  const l = loyalty(spent);
  const active = orders.find((o) => ["PENDING", "PROCESSING", "SHIPPED"].includes(o.status));
  const purchasedIds = [...new Set(purchased.map((p) => p.productId!))];
  const catIds = [...new Set(purchased.map((p) => p.product?.categoryId).filter(Boolean))] as string[];

  const [buyAgainRaw, recommendedRaw] = await Promise.all([
    db.product.findMany({ where: { ...base, id: { in: purchasedIds } }, include: { category: true }, take: 4 }),
    db.product.findMany({
      where: { ...base, id: { notIn: purchasedIds }, ...(catIds.length ? { categoryId: { in: catIds } } : { featured: true }) },
      include: { category: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);
  const [buyAgain, recommended] = await Promise.all([withRatings(buyAgainRaw), withRatings(recommendedRaw)]);
  const unusable = coupons.filter((c) => c.maxUses != null && c.usedCount >= c.maxUses).map((c) => c.id);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const stats = [
    { label: "Orders placed", value: orders.length.toString(), icon: Package, href: "/account/orders" },
    { label: "Total spent", value: fmt(spent), icon: Wallet, href: "/account/orders" },
    { label: "Reward points", value: l.points.toLocaleString(), icon: Gift, href: "#rewards" },
    { label: "Reviews written", value: reviewCount.toString(), icon: Star, href: "/account/reviews" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{greeting}, {user.name.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-slate-500">Member since {formatDate(user.createdAt)} · Here&apos;s what&apos;s happening with your account.</p>
        </div>
        <Link href="/products" className="btn-primary"><ShoppingBag className="h-4 w-4" /> Continue shopping</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
              <s.icon className="h-5 w-5" />
            </span>
            <p className="mt-4 text-2xl font-bold tracking-tight">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Active order */}
        <div className="card p-6 xl:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{active ? "Track your order" : "Latest order"}</h2>
            {orders[0] && <Link href="/account/orders" className="text-sm font-semibold text-brand-600 hover:underline">All orders</Link>}
          </div>
          {active || orders[0] ? (
            (() => {
              const o = active ?? orders[0];
              const imgs = o.items.slice(0, 4);
              return (
                <div className="mt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold">{o.orderNumber}</p>
                      <p className="text-xs text-slate-500">Placed {formatDate(o.createdAt)} · {o.items.length} item{o.items.length > 1 ? "s" : ""} · {fmt(o.total)}</p>
                    </div>
                    <div className="flex -space-x-3">
                      {imgs.map((i) => (
                        <SafeImage key={i.id} src={i.image} alt={i.name} className="h-11 w-11 rounded-full object-cover ring-2 ring-white" />
                      ))}
                    </div>
                  </div>
                  <div className="mt-6"><OrderProgress status={o.status} /></div>
                  <Link href={`/account/orders/${o.id}`} className="btn-secondary mt-6 w-full sm:w-auto">
                    View order details <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })()
          ) : (
            <div className="mt-6 rounded-xl bg-slate-50 p-8 text-center">
              <Package className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 font-semibold">No orders yet</p>
              <p className="text-sm text-slate-500">When you place an order, you can track it here.</p>
              <Link href="/products" className="btn-primary mt-4">Start shopping</Link>
            </div>
          )}
        </div>

        {/* Rewards */}
        <div id="rewards" className="card scroll-mt-40 overflow-hidden xl:col-span-2">
          <div className={cn("bg-gradient-to-br p-6 text-white", l.tier.color)}>
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-semibold"><Sparkles className="h-4 w-4" /> {l.tier.name} member</p>
              <p className="text-xs text-white/80">{l.points.toLocaleString()} pts</p>
            </div>
            {l.next ? (
              <>
                <p className="mt-4 text-sm text-white/90">Spend <strong>{fmt(l.toNext)}</strong> more to reach <strong>{l.next.name}</strong></p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25">
                  <div className="h-full rounded-full bg-white" style={{ width: `${l.progress}%` }} />
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-white/90">You&apos;ve reached our highest tier. Thank you! 💜</p>
            )}
          </div>
          <ul className="divide-y divide-slate-100 px-6">
            {TIERS.map((t) => {
              const reached = spent >= t.min;
              return (
                <li key={t.name} className="flex items-center gap-3 py-3 text-sm">
                  <span className={cn("h-3 w-3 rounded-full bg-gradient-to-br", t.color, !reached && "opacity-30")} />
                  <span className={cn("w-20 font-semibold", !reached && "text-slate-400")}>{t.name}</span>
                  <span className={cn("flex-1 text-xs", reached ? "text-slate-600" : "text-slate-400")}>{t.perk}</span>
                  <span className="text-xs text-slate-400">{t.min ? `${fmt(t.min).replace(/\.00$/, "")}+` : "Join"}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Coupons */}
        <div className="card p-6">
          <h2 className="flex items-center gap-2 font-semibold"><Ticket className="h-5 w-5 text-brand-600" /> Your coupons</h2>
          <ul className="mt-4 space-y-3">
            {coupons.filter((c) => !unusable.includes(c.id)).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-brand-50 to-white p-3 ring-1 ring-brand-100">
                <div>
                  <p className="font-bold text-brand-700">{c.type === "PERCENT" ? `${c.value}% off` : `${fmt(c.value)} off`}</p>
                  <p className="text-xs text-slate-500">
                    {c.minOrder ? `On orders over ${fmt(c.minOrder)}` : "No minimum spend"}
                    {c.expiresAt && ` · Expires ${formatDate(c.expiresAt)}`}
                  </p>
                </div>
                <CopyCode code={c.code} />
              </li>
            ))}
            {!coupons.length && <li className="text-sm text-slate-500">No coupons available right now.</li>}
          </ul>
        </div>

        {/* Address */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><MapPin className="h-5 w-5 text-brand-600" /> Default address</h2>
            <Link href="/account/addresses" className="text-sm font-semibold text-brand-600 hover:underline">Manage</Link>
          </div>
          {defaultAddress ? (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
              <span className="badge bg-white text-slate-700 ring-1 ring-slate-200">{defaultAddress.label}</span>
              <p className="mt-2 font-semibold">{defaultAddress.name}</p>
              <p className="text-slate-600">{defaultAddress.address}, {defaultAddress.city} {defaultAddress.postalCode}, {defaultAddress.country}</p>
              <p className="text-slate-500">{defaultAddress.phone}</p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm">
              <p className="text-slate-500">Save an address for one-click checkout.</p>
              <Link href="/account/addresses" className="btn-secondary mt-3">Add address</Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent orders */}
      {orders.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-5">
            <h2 className="font-semibold">Recent orders</h2>
            <Link href="/account/orders" className="text-sm font-semibold text-brand-600 hover:underline">View all</Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {orders.slice(0, 4).map((o) => (
              <li key={o.id}>
                <Link href={`/account/orders/${o.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                  <SafeImage src={o.items[0]?.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold">{o.orderNumber}</p>
                    <p className="truncate text-xs text-slate-500">{o.items.map((i) => i.name).join(", ")}</p>
                  </div>
                  <span className={cn("badge hidden sm:inline-flex", statusColor(o.status))}>{o.status.toLowerCase()}</span>
                  <span className="w-24 text-right text-sm font-semibold">{fmt(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {buyAgain.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Buy again</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
            {buyAgain.map((p) => <ProductCard key={p.id} product={p} currency={settings.currency} />)}
          </div>
        </section>
      )}

      {recommended.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Recommended for you</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
            {recommended.map((p) => <ProductCard key={p.id} product={p} currency={settings.currency} />)}
          </div>
        </section>
      )}
    </div>
  );
}
