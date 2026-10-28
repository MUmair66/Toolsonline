import Link from "next/link";
import { ArrowRight, BadgeCheck, Banknote, Quote, ShieldCheck, Star, Timer, Truck, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { visibleWhere, withRatings } from "@/lib/products";
import { formatPrice, parseImages } from "@/lib/utils";
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
  const [featuredRaw, latestRaw, categories, saleRaw, stats, reviews, productCount, brands] = await Promise.all([
    db.product.findMany({ where: { ...base, featured: true }, include: { category: true, brand: true }, take: 8, orderBy: { price: "asc" } }),
    db.product.findMany({ where: base, include: { category: true, brand: true }, take: 8, orderBy: { createdAt: "desc" } }),
    db.category.findMany({ include: { _count: { select: { products: { where: base } } } }, orderBy: { name: "asc" } }),
    db.product.findMany({ where: { ...base, comparePrice: { not: null } }, include: { category: true, brand: true }, take: 4 }),
    db.review.aggregate({ where: { approved: true }, _avg: { rating: true }, _count: true }),
    db.review.findMany({
      where: { approved: true, rating: { gte: 4 } },
      include: { user: { select: { name: true } }, product: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    db.product.count({ where: base }),
    db.brand.findMany({ include: { _count: { select: { products: { where: base } } } }, orderBy: { name: "asc" } }),
  ]);
  const [featured, latest, sale] = await Promise.all([withRatings(featuredRaw), withRatings(latestRaw), withRatings(saleRaw)]);
  const bestDeal = Math.max(0, ...saleRaw.map((p) => (p.comparePrice ? Math.round((1 - p.price / p.comparePrice) * 100) : 0)));
  const shownCategories = categories.filter((c) => c._count.products > 0);
  const shownBrands = brands.filter((b) => b._count.products > 0);
  const heroShots = featuredRaw.map((p) => ({ name: p.name, slug: p.slug, img: parseImages(p.images)[0] })).filter((p) => p.img).slice(0, 3);
  const cheapest = await db.product.aggregate({ where: { ...base, price: { gt: 0 } }, _min: { price: true } });

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950">
        <div className="pointer-events-none absolute -top-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-brand-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-brand-600/25 blur-3xl" />
        <div className="container-x relative grid items-center gap-12 py-14 lg:grid-cols-2 lg:py-20">
          <div className="text-white">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-400/10 px-3 py-1 text-xs font-semibold text-brand-300">
              <Wrench className="h-3.5 w-3.5" /> {settings.tagline}
            </span>
            <h1 className="mt-6 text-4xl leading-[1.1] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Professional power tools,{" "}
              <span className="text-brand-400">delivered to your door.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-slate-300">
              Grinders, drills, hammers, cutters, welding machines and more{shownBrands.length ? ` from ${shownBrands.map((b) => b.name).join(", ")}` : ""}
              {cheapest._min.price ? ` — starting at ${formatPrice(cheapest._min.price, settings.currency)}` : ""}.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="btn !bg-brand-400 !px-6 !py-3 !text-base !text-slate-950 shadow-lg shadow-brand-400/20 hover:!bg-brand-300">
                Shop all tools <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/categories" className="btn !border !border-white/20 !px-6 !py-3 !text-base text-white hover:bg-white/10">
                Browse categories
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-8">
              <div>
                <dt className="text-xs text-slate-400">Products</dt>
                <dd className="mt-1 text-2xl font-bold">{productCount.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Categories</dt>
                <dd className="mt-1 text-2xl font-bold">{shownCategories.length}</dd>
              </div>
              {stats._count > 0 ? (
                <div>
                  <dt className="text-xs text-slate-400">Average rating</dt>
                  <dd className="mt-1 flex items-center gap-1 text-2xl font-bold">
                    {(stats._avg.rating ?? 0).toFixed(1)} <Star className="h-5 w-5 fill-brand-400 text-brand-400" />
                  </dd>
                </div>
              ) : (
                <div>
                  <dt className="text-xs text-slate-400">Payment</dt>
                  <dd className="mt-1 text-2xl font-bold">COD</dd>
                </div>
              )}
            </dl>
          </div>

          {heroShots.length > 0 && (
            <div className="relative hidden lg:block">
              <div className="grid grid-cols-2 gap-4">
                {heroShots.map((p, i) => (
                  <Link
                    key={p.slug}
                    href={`/products/${p.slug}`}
                    className={`group overflow-hidden rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-white/10 ${i === 0 ? "row-span-2 flex items-center" : "aspect-square"}`}
                  >
                    <SafeImage src={p.img} alt={p.name} className="h-full w-full object-contain transition duration-500 group-hover:scale-105" />
                  </Link>
                ))}
              </div>
              <div className="absolute bottom-6 -left-6 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-2xl">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100"><Banknote className="h-5 w-5 text-brand-700" /></span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Cash on delivery</p>
                  <p className="text-xs text-slate-500">Pay when your tools arrive</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-slate-200 bg-white">
        <div className="container-x grid grid-cols-1 gap-4 py-5 text-sm sm:grid-cols-3">
          {[
            { icon: Truck, text: settings.freeShippingThreshold > 0 ? `Free delivery on orders over ${formatPrice(settings.freeShippingThreshold, settings.currency)}` : "Delivery across the country" },
            { icon: Banknote, text: "Cash on delivery available" },
            { icon: ShieldCheck, text: "Secure checkout" },
          ].map((t) => (
            <p key={t.text} className="flex items-center justify-center gap-2 font-medium text-slate-700">
              <t.icon className="h-5 w-5 text-brand-600" /> {t.text}
            </p>
          ))}
        </div>
      </section>

      {/* Categories */}
      {shownCategories.length > 0 && (
        <section className="container-x py-14">
          <SectionHeader title="Shop by category" subtitle="Find the right tool for the job" href="/categories" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {shownCategories.map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                className="group flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 text-center transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-lg"
              >
                <div className="aspect-square w-full max-w-[150px]">
                  <SafeImage src={c.image} alt={c.name} className="h-full w-full object-contain transition duration-500 group-hover:scale-105" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900 group-hover:text-brand-600">{c.name}</p>
                <p className="text-xs text-slate-500">{c._count.products} products</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <section className="container-x py-8">
          <SectionHeader title="Bestsellers" subtitle="Popular tools picked by our team" href="/products?featured=1" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
            {featured.map((p) => <ProductCard key={p.id} product={p} currency={settings.currency} />)}
          </div>
        </section>
      )}

      {/* Deals band (only when something is on sale) */}
      {sale.length > 0 && (
        <section className="mt-16 bg-gradient-to-br from-rose-50 via-white to-amber-50 py-16">
          <div className="container-x">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                  <Timer className="h-3.5 w-3.5" /> Deals
                </span>
                <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Save up to {bestDeal}%</h2>
                <p className="mt-1 text-slate-500">Discounted tools — while stocks last.</p>
              </div>
              <Link href="/products?sale=1&sort=discount" className="btn-primary">Shop all deals <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
              {sale.map((p) => <ProductCard key={p.id} product={p} currency={settings.currency} />)}
            </div>
          </div>
        </section>
      )}

      {/* Shop by brand */}
      {shownBrands.length > 0 && (
        <section className="container-x py-14">
          <SectionHeader title="Shop by brand" subtitle="Genuine tools from the brands we stock" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {shownBrands.map((b) => (
              <Link
                key={b.id}
                href={`/products?brand=${b.slug}`}
                className="group flex items-center justify-between gap-3 rounded-2xl bg-slate-950 p-5 text-white transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                {b.logo ? (
                  <SafeImage src={b.logo} alt={b.name} className="h-10 w-auto object-contain" />
                ) : (
                  <span className="text-2xl font-black tracking-tight text-brand-400">{b.name}</span>
                )}
                <span className="text-right text-xs text-slate-400">
                  {b._count.products} products
                  <ArrowRight className="ml-auto mt-1 h-4 w-4 text-brand-400 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Help banner */}
      <section className="container-x py-8">
        <div className="relative overflow-hidden rounded-3xl bg-brand-400 px-6 py-10 text-slate-950 sm:px-12">
          <Wrench className="pointer-events-none absolute -right-6 -bottom-8 h-48 w-48 rotate-12 text-slate-950/10" />
          <div className="relative max-w-xl">
            <p className="text-sm font-bold tracking-wider uppercase">Not sure which tool you need?</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Tell us about the job — we&apos;ll help you choose.</h2>
            <Link href="/contact" className="btn mt-6 bg-slate-950 !px-6 !py-3 text-white hover:bg-slate-800">
              Contact us <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* New arrivals */}
      <section className="container-x py-8">
        <SectionHeader title="New arrivals" subtitle="The latest additions to our catalog" href="/products?sort=newest" />
        {latest.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
            {latest.map((p) => <ProductCard key={p.id} product={p} currency={settings.currency} />)}
          </div>
        ) : (
          <p className="text-slate-500">No products yet. Add some from the admin dashboard.</p>
        )}
      </section>

      {/* Testimonials (only real reviews) */}
      {reviews.length > 0 && (
        <section className="container-x py-16">
          <SectionHeader title="What customers say" subtitle={`${stats._count} reviews · ${(stats._avg.rating ?? 0).toFixed(1)} average rating`} />
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
      <section className="container-x pt-8 pb-4">
        <div className="flex flex-col items-center gap-6 rounded-3xl bg-slate-100 px-6 py-12 text-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Get new arrivals and offers first</h2>
            <p className="mt-2 text-slate-600">Join the {settings.storeName} mailing list. No spam.</p>
          </div>
          <Newsletter />
        </div>
      </section>
    </>
  );
}
