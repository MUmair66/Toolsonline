import Link from "next/link";
import { ArrowRight, BadgeCheck, Quote, Sparkles, Star, Timer, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { visibleWhere, withRatings } from "@/lib/products";
import { formatPrice } from "@/lib/utils";
import { ProductCard } from "@/components/shop/ProductCard";
import { Newsletter } from "@/components/shop/Newsletter";
import { SafeImage } from "@/components/ui/SafeImage";

function SectionHeader({ title, subtitle, href, cta = "View all" }: { title: string; subtitle: string; href?: string; cta?: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        <p className="mt-1 text-slate-500">{subtitle}</p>
      </div>
      {href && (
        <Link href={href} className="group flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-600">
          {cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  const settings = await getSettings();
  const base = visibleWhere(settings);
  const [featuredRaw, latestRaw, categories, saleRaw, stats, reviews, productCount] = await Promise.all([
    db.product.findMany({ where: { ...base, featured: true }, include: { category: true }, take: 8, orderBy: { createdAt: "desc" } }),
    db.product.findMany({ where: base, include: { category: true }, take: 8, orderBy: { createdAt: "desc" } }),
    db.category.findMany({ include: { _count: { select: { products: { where: base } } } }, orderBy: { name: "asc" } }),
    db.product.findMany({ where: { ...base, comparePrice: { not: null } }, include: { category: true }, take: 4 }),
    db.review.aggregate({ where: { approved: true }, _avg: { rating: true }, _count: true }),
    db.review.findMany({
      where: { approved: true, rating: { gte: 4 } },
      include: { user: { select: { name: true } }, product: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    db.product.count({ where: base }),
  ]);
  const [featured, latest, sale] = await Promise.all([withRatings(featuredRaw), withRatings(latestRaw), withRatings(saleRaw)]);
  const bestDeal = Math.max(0, ...saleRaw.map((p) => (p.comparePrice ? Math.round((1 - p.price / p.comparePrice) * 100) : 0)));

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950">
        <div className="pointer-events-none absolute -top-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-brand-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="container-x relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div className="text-white">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> New season collection is here
            </span>
            <h1 className="mt-6 text-4xl leading-[1.1] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Everything you love,{" "}
              <span className="bg-gradient-to-r from-brand-100 via-white to-fuchsia-200 bg-clip-text text-transparent">delivered.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-slate-300">{settings.tagline} Curated electronics, fashion, home and beauty — at prices you&apos;ll smile about.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="btn-primary !px-6 !py-3 !text-base shadow-lg shadow-brand-600/30">
                Shop now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/products?sale=1" className="btn !border !border-white/20 !px-6 !py-3 !text-base text-white hover:bg-white/10">
                View deals
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-8">
              <div>
                <dt className="text-xs text-slate-400">Products</dt>
                <dd className="mt-1 text-2xl font-bold">{productCount.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Average rating</dt>
                <dd className="mt-1 flex items-center gap-1 text-2xl font-bold">
                  {(stats._avg.rating ?? 4.8).toFixed(1)} <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Free shipping</dt>
                <dd className="mt-1 text-2xl font-bold">{settings.freeShippingThreshold > 0 ? `${formatPrice(settings.freeShippingThreshold, settings.currency).replace(/\.00$/, "")}+` : "Always"}</dd>
              </div>
            </dl>
          </div>
          <div className="relative hidden lg:block">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4 pt-10">
                <div className="aspect-[3/4] overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
                  <SafeImage src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80&auto=format&fit=crop" alt="Store" className="h-full w-full object-cover" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="aspect-square overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
                  <SafeImage src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80&auto=format&fit=crop" alt="Headphones" className="h-full w-full object-cover" />
                </div>
                <div className="aspect-square overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
                  <SafeImage src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80&auto=format&fit=crop" alt="Sneakers" className="h-full w-full object-cover" />
                </div>
              </div>
            </div>
            <div className="absolute bottom-8 -left-6 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-2xl">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100"><Truck className="h-5 w-5 text-emerald-600" /></span>
              <div>
                <p className="text-sm font-bold text-slate-900">Fast delivery</p>
                <p className="text-xs text-slate-500">Ships within 24 hours</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="container-x py-16">
          <SectionHeader title="Shop by category" subtitle="Find exactly what you're looking for" href="/categories" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => (
              <Link key={c.id} href={`/products?category=${c.slug}`} className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-slate-100">
                <SafeImage src={c.image} alt={c.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute inset-x-3 bottom-3 text-white">
                  <p className="font-semibold">{c.name}</p>
                  <p className="flex items-center gap-1 text-xs text-white/80">
                    {c._count.products} products <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <section className="container-x py-8">
          <SectionHeader title="Trending now" subtitle="Our most-loved products this week" href="/products?featured=1" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
            {featured.map((p) => <ProductCard key={p.id} product={p} currency={settings.currency} />)}
          </div>
        </section>
      )}

      {/* Deals band */}
      {sale.length > 0 && (
        <section className="mt-16 bg-gradient-to-br from-rose-50 via-white to-amber-50 py-16">
          <div className="container-x">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                  <Timer className="h-3.5 w-3.5" /> Limited-time deals
                </span>
                <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Save up to {bestDeal}% today</h2>
                <p className="mt-1 text-slate-500">Hand-picked discounts — while stocks last.</p>
              </div>
              <Link href="/products?sale=1&sort=discount" className="btn-primary">Shop all deals <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
              {sale.map((p) => <ProductCard key={p.id} product={p} currency={settings.currency} />)}
            </div>
          </div>
        </section>
      )}

      {/* Promo banner */}
      <section className="container-x py-16">
        <div className="relative overflow-hidden rounded-3xl bg-brand-600 px-6 py-12 text-white sm:px-12">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10" />
          <div className="absolute right-40 -bottom-24 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative max-w-xl">
            <p className="text-sm font-semibold tracking-wider text-brand-100 uppercase">New here?</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Get 10% off your first order</h2>
            <p className="mt-3 text-brand-100">
              Use code <span className="rounded bg-white/20 px-2 py-0.5 font-mono font-bold text-white">WELCOME10</span> at checkout.
            </p>
            <Link href="/products" className="btn mt-6 bg-white !px-6 !py-3 text-brand-700 hover:bg-brand-50">
              Start shopping <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* New arrivals */}
      <section className="container-x py-8">
        <SectionHeader title="New arrivals" subtitle="Fresh additions to our store" href="/products?sort=newest" />
        {latest.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
            {latest.map((p) => <ProductCard key={p.id} product={p} currency={settings.currency} />)}
          </div>
        ) : (
          <p className="text-slate-500">No products yet. Add some from the admin dashboard.</p>
        )}
      </section>

      {/* Testimonials */}
      {reviews.length > 0 && (
        <section className="container-x py-16">
          <SectionHeader title="Loved by our customers" subtitle={`${stats._count} verified reviews · ${(stats._avg.rating ?? 0).toFixed(1)} average rating`} />
          <div className="grid gap-6 md:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.id} className="card relative p-6">
                <Quote className="absolute top-5 right-5 h-8 w-8 text-slate-100" />
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-4 w-4 ${i <= r.rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`} />)}
                </div>
                <blockquote className="mt-4 text-slate-700">&ldquo;{r.comment}&rdquo;</blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{r.user.name.charAt(0)}</span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 text-sm font-semibold">{r.user.name} <BadgeCheck className="h-4 w-4 text-emerald-500" /></p>
                    <Link href={`/products/${r.product.slug}`} className="block truncate text-xs text-slate-500 hover:text-brand-600">on {r.product.name}</Link>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="container-x pb-4">
        <div className="flex flex-col items-center gap-6 rounded-3xl bg-slate-100 px-6 py-12 text-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Join the {settings.storeName} club</h2>
            <p className="mt-2 text-slate-600">Early access to sales, new arrivals and members-only coupons. No spam, ever.</p>
          </div>
          <Newsletter />
        </div>
      </section>
    </>
  );
}
