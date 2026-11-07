import Link from "next/link";
import { ArrowRight, BadgeCheck, Banknote, Headphones, MapPin, MessageCircle, Phone, ShieldCheck, Star, Truck } from "lucide-react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { CATALOG_TAG, getSettings } from "@/lib/settings";
import { visibleWhere, withRatings } from "@/lib/products";
import { formatPrice, parseImages } from "@/lib/utils";
import { STORE, telHref, whatsappHref } from "@/lib/store";
import { Newsletter } from "@/components/shop/Newsletter";
import { SafeImage } from "@/components/ui/SafeImage";
import { HeroShowcase, ShowcaseCta, type ShowcaseItem } from "@/components/home/HeroShowcase";
import { ProductTabs, type ProductTab } from "@/components/home/ProductTabs";
import { ProductRail } from "@/components/home/ProductRail";

/* ---------- helpers ---------- */

function SectionHeader({ eyebrow, title, subtitle, href, cta = "View all" }: { eyebrow?: string; title: string; subtitle?: string; href?: string; cta?: string }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div>
        {eyebrow && <p className="text-xs font-bold tracking-[0.14em] text-brand-700 uppercase">{eyebrow}</p>}
        <h2 className="mt-1.5 text-2xl leading-tight font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] text-slate-500">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="group inline-flex shrink-0 items-center gap-1.5 border-b-2 border-brand-400 pb-0.5 text-sm font-semibold text-slate-900">
          {cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

/** Spec lines are stored in the description as "• Power: 2800W". */
function specsOf(description: string) {
  return description
    .split("\n")
    .filter((l) => l.trim().startsWith("•"))
    .map((l) => l.replace(/^\s*•\s*/, "").trim());
}

const BUDGETS = [
  { label: "Under Rs. 5,000", min: 0, max: 5000, note: "Everyday essentials" },
  { label: "Rs. 5,000 – 20,000", min: 5000, max: 20000, note: "Workshop favourites" },
  { label: "Rs. 20,000 – 75,000", min: 20000, max: 75000, note: "Heavy-duty machines" },
  { label: "Rs. 75,000+", min: 75000, max: null as number | null, note: "Industrial equipment" },
];

/**
 * All home-page data, cached so most visits don't touch the database at all.
 * Product/category/brand/review edits and new orders clear it via revalidateTag(CATALOG_TAG);
 * otherwise it refreshes every 5 minutes. Cached values are JSON, so dates come back as strings.
 */
const loadHomeData = unstable_cache(
  async (autoHideOutOfStock: boolean) => {
    const base = visibleWhere({ autoHideOutOfStock });
    const [productsRaw, categoriesRaw, catStats, brandsRaw, reviewAgg, reviews, ...budgetCounts] = await Promise.all([
      db.product.findMany({ where: base, include: { category: true, brand: true }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: 400 }),
      db.category.findMany({ orderBy: { name: "asc" } }),
      db.product.groupBy({ by: ["categoryId"], where: base, _count: { _all: true }, _min: { price: true } }),
      db.brand.findMany({ include: { _count: { select: { products: { where: base } } } }, orderBy: { name: "asc" } }),
      db.review.aggregate({ where: { approved: true }, _avg: { rating: true }, _count: true }),
      db.review.findMany({
        where: { approved: true, rating: { gte: 4 } },
        include: { user: { select: { name: true } }, product: { select: { name: true, slug: true } } },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      ...BUDGETS.map((b) => db.product.count({ where: { ...base, price: { gte: b.min, ...(b.max ? { lt: b.max } : {}) } } })),
    ]);
    const products = await withRatings(productsRaw);
    return { products, categoriesRaw, catStats, brandsRaw, reviewAgg, reviews, budgetCounts: budgetCounts as number[] };
  },
  ["home-data-v3"],
  { tags: [CATALOG_TAG], revalidate: 300 }
);

/* ---------- page ---------- */

export default async function HomePage() {
  const settings = await getSettings();
  const fmt = (n: number) => formatPrice(n, settings.currency);
  const { products, categoriesRaw, catStats, brandsRaw, reviewAgg, reviews, budgetCounts } = await loadHomeData(settings.autoHideOutOfStock);

  const img = (p: { images: string }) => parseImages(p.images)[0] ?? "";
  const withImg = products.filter((p) => img(p));

  const categories = categoriesRaw
    .map((c) => {
      const s = catStats.find((x) => x.categoryId === c.id);
      return { ...c, count: s?._count._all ?? 0, min: s?._min.price ?? 0 };
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
  const brands = brandsRaw.filter((b) => b._count.products > 0);
  const catImage = (catId: string, fallback: string | null) => {
    const p = withImg.find((x) => x.categoryId === catId);
    return p ? img(p) : fallback;
  };

  // Hero showcase: the best product (featured first, then priciest) from each of the top categories.
  const showcase: ShowcaseItem[] = categories
    .slice(0, 5)
    .map((c) => withImg.filter((p) => p.categoryId === c.id).sort((a, b) => Number(b.featured) - Number(a.featured) || b.price - a.price)[0])
    .filter((p): p is (typeof withImg)[number] => !!p)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      brand: p.brand?.name ?? null,
      category: p.category?.name ?? null,
      image: img(p),
      price: fmt(p.price),
      inStock: p.stock > 0,
      specs: specsOf(p.description)
        .map((s) => {
          const [label, ...v] = s.split(":");
          return v.length ? { label: label.trim(), value: v.join(":").trim() } : null;
        })
        .filter((s): s is { label: string; value: string } => !!s),
    }));

  const tabs: ProductTab[] = categories.slice(0, 4).map((c) => ({
    key: c.slug,
    label: c.name,
    href: `/products?category=${c.slug}`,
    count: c.count,
    products: products
      .filter((p) => p.categoryId === c.id)
      .sort((a, b) => Number(b.featured) - Number(a.featured) || a.price - b.price)
      .slice(0, 8),
  }));

  const newArrivals = withImg
    .filter((p) => p.stock > 0)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12);
  const budgets = BUDGETS.map((b, i) => ({ ...b, count: budgetCounts[i] })).filter((b) => b.count > 0);
  const freeShip = settings.freeShippingThreshold > 0 ? fmt(settings.freeShippingThreshold) : null;

  return (
    <div className="bg-white">
      <h1 className="sr-only">
        {settings.storeName} — {settings.tagline}
      </h1>

      {/* 1. Hero */}
      <section className="relative overflow-hidden bg-[#f3f3f1]">
        <div className="pointer-events-none absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-brand-200/40 blur-3xl" />
        <div className="container-x relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:py-20">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Power tools &amp; machinery · {STORE.city}
            </p>
            <p className="mt-6 text-5xl leading-[0.95] font-black tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Built for
              <br />
              <span className="relative inline-block">
                real work
                <svg className="absolute -bottom-2 left-0 w-full text-brand-400" viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden>
                  <path d="M2 9 C 80 2, 220 2, 298 7" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" />
                </svg>
              </span>
              <span className="text-brand-500">.</span>
            </p>
            <p className="mt-6 text-2xl leading-snug font-semibold text-slate-800 sm:text-3xl">
              Professional tools, honest prices<span className="text-slate-300">…</span>
            </p>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-600 sm:text-base">
              Grinders, hammers, drills, cutters and welding machines from {brands.map((b) => b.name).join(" & ") || "trusted brands"}. Order online and pay cash on delivery.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
              <ShowcaseCta href="/products" />
              <span className="hidden text-sm text-slate-400 sm:inline">or</span>
              <a
                href={whatsappHref()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300"
              >
                <MessageCircle className="h-4 w-4 text-[#25D366]" /> Ask on WhatsApp
              </a>
            </div>
          </div>

          <HeroShowcase items={showcase} />
        </div>
      </section>

      {/* 2. Brands & promises strip */}
      <section className="relative z-10 -mt-6 sm:-mt-8">
        <div className="container-x">
          <div className="relative mx-auto max-w-5xl">
            <div className="absolute inset-x-6 -bottom-1.5 h-3 rounded-b-2xl bg-brand-400" />
            <div className="relative grid grid-cols-2 gap-y-4 rounded-2xl bg-white px-4 py-5 shadow-[0_14px_40px_-16px_rgba(15,23,42,0.25)] sm:grid-cols-4 sm:px-6">
              {[
                ...brands.slice(0, 2).map((b) => ({ key: b.id, top: b.name, sub: `${b._count.products} products`, href: `/products?brand=${b.slug}`, brand: true })),
                { key: "cod", top: "Cash on delivery", sub: "Pay when it arrives", icon: Banknote },
                { key: "ship", top: freeShip ? "Free delivery" : "Fast delivery", sub: freeShip ? `Over ${freeShip}` : `Flat ${fmt(settings.shippingFee)}`, icon: Truck },
              ]
                .slice(0, 4)
                .map((x) => {
                  const inner = (
                    <>
                      {"brand" in x ? (
                        <span className="text-xl font-black tracking-wide text-slate-900 sm:text-2xl">{x.top}</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900 sm:text-[15px]">
                          {"icon" in x && x.icon && <x.icon className="h-4 w-4 text-brand-600" />} {x.top}
                        </span>
                      )}
                      <span className="mt-0.5 text-xs text-slate-500">{x.sub}</span>
                    </>
                  );
                  const cls = "flex flex-col items-center justify-center text-center";
                  return "href" in x && x.href ? (
                    <Link key={x.key} href={x.href} className={`${cls} transition hover:opacity-70`}>{inner}</Link>
                  ) : (
                    <div key={x.key} className={cls}>{inner}</div>
                  );
                })}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Categories */}
      {categories.length > 0 && (
        <section className="container-x pt-16 pb-12 sm:pt-20 sm:pb-16">
          <SectionHeader eyebrow="Browse" title="Shop by category" href="/categories" cta="All categories" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-5">
            {categories.slice(0, 10).map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                className="group flex flex-col rounded-2xl bg-[#f6f6f4] p-4 transition hover:bg-white hover:shadow-[0_14px_30px_-14px_rgba(15,23,42,0.3)] hover:ring-1 hover:ring-slate-200"
              >
                <span className="block h-28 sm:h-32">
                  <SafeImage src={catImage(c.id, c.image)} alt={c.name} className="h-full w-full object-contain mix-blend-multiply transition duration-300 group-hover:scale-105" />
                </span>
                <span className="mt-3 line-clamp-1 text-sm font-bold text-slate-900 sm:text-[15px]">{c.name}</span>
                <span className="mt-0.5 flex items-center justify-between text-xs text-slate-500">
                  {c.count} products
                  <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 4. Bestsellers */}
      {tabs.length > 0 && (
        <section className="bg-[#f6f6f4] py-12 sm:py-16">
          <div className="container-x">
            <SectionHeader eyebrow="Popular" title="Bestselling tools" subtitle="The tools our customers order most." href="/products?featured=1" cta="See all" />
            <ProductTabs tabs={tabs} currency={settings.currency} />
          </div>
        </section>
      )}

      {/* 5. Delivered to your door */}
      <section className="container-x py-12 sm:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-300 to-brand-400 p-6 sm:p-10">
            <div className="pointer-events-none absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-white/25" />
            <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { icon: Truck, title: freeShip ? "Free delivery" : "Delivery", text: freeShip ? `On orders over ${freeShip}` : `Flat ${fmt(settings.shippingFee)}` },
                { icon: Banknote, title: "Cash on delivery", text: "Pay when it arrives" },
                { icon: ShieldCheck, title: "Secure checkout", text: "Card or cash" },
                { icon: Headphones, title: "Expert advice", text: "Help choosing a tool" },
              ].map((f) => (
                <div key={f.title} className="rounded-2xl bg-white p-4 shadow-[0_10px_24px_-14px_rgba(15,23,42,0.35)] sm:p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-brand-400">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm font-bold text-slate-900 sm:text-[15px]">{f.title}</p>
                  <p className="text-xs text-slate-500 sm:text-[13px]">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-800">Simple &amp; safe ordering</p>
            <h2 className="mt-4 text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
              Easily get it delivered
              <br className="hidden sm:block" /> to your door-step.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-600">
              Choose your tool, check out in a minute, and pay cash when it arrives. Not sure which model fits the job? Call or WhatsApp us and we will help you choose.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href={telHref(STORE.phones[0])} className="inline-flex h-12 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-black">
                <Phone className="h-4 w-4" /> {STORE.phones[0]}
              </a>
              <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-900 transition hover:border-slate-400">
                <MessageCircle className="h-4 w-4 text-[#25D366]" /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Shop by price */}
      {budgets.length > 0 && (
        <section className="container-x pb-12 sm:pb-16">
          <SectionHeader eyebrow="Budget" title="Shop by price" />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {budgets.map((b) => (
              <Link
                key={b.label}
                href={`/products?${b.min ? `min=${b.min}&` : ""}${b.max ? `max=${b.max - 1}&` : ""}sort=price-asc`}
                className="group flex flex-col rounded-2xl border border-slate-200 p-4 transition hover:border-slate-900 sm:p-5"
              >
                <span className="text-xs text-slate-500">{b.note}</span>
                <span className="mt-1 text-lg leading-tight font-extrabold sm:text-xl">{b.label}</span>
                <span className="mt-4 flex items-center justify-between text-[13px] font-semibold">
                  {b.count} tools <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 7. New arrivals */}
      {newArrivals.length > 0 && (
        <section className="bg-[#f6f6f4] py-12 sm:py-16">
          <div className="container-x">
            <ProductRail products={newArrivals} currency={settings.currency} title="New arrivals" subtitle="The latest additions to our catalog." />
          </div>
        </section>
      )}

      {/* 8. Reviews (only real ones) */}
      {reviews.length > 0 && (
        <section className="container-x py-12 sm:py-16">
          <SectionHeader eyebrow="Reviews" title="What customers say" subtitle={`${reviewAgg._count} reviews · ${(reviewAgg._avg.rating ?? 0).toFixed(1)} average rating`} />
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.id} className="flex flex-col rounded-2xl border border-slate-200 p-6">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className={`h-4 w-4 ${i <= r.rating ? "fill-brand-400 text-brand-400" : "fill-slate-200 text-slate-200"}`} />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 leading-relaxed text-slate-700">&ldquo;{r.comment}&rdquo;</blockquote>
                <figcaption className="mt-5 flex items-center gap-1.5 border-t border-slate-100 pt-4 text-sm font-semibold">
                  {r.user.name} <BadgeCheck className="h-4 w-4 text-emerald-500" />
                  <Link href={`/products/${r.product.slug}`} className="ml-auto truncate text-xs font-normal text-slate-500 hover:text-slate-900">
                    {r.product.name}
                  </Link>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* 9. Visit us + newsletter */}
      <section className="container-x py-12 sm:py-16">
        <div className="grid gap-4 overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:gap-10">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-brand-400 uppercase">Visit or call us</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Our store in {STORE.city}</h2>
            <a href={STORE.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-4 flex max-w-md items-start gap-2 text-sm text-slate-300 hover:text-white">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" /> {STORE.address}
            </a>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {STORE.phones.map((p) => (
                <a key={p} href={telHref(p)} className="flex items-center gap-2 text-slate-300 hover:text-white">
                  <Phone className="h-4 w-4 text-brand-400" /> {p}
                </a>
              ))}
            </div>
            <a href={STORE.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-1.5 border-b-2 border-brand-400 pb-0.5 text-sm font-semibold">
              Get directions <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 sm:p-6">
            <p className="font-bold">Get new arrivals and offers first</p>
            <p className="mt-0.5 text-[13px] text-slate-400">Join the {settings.storeName} mailing list. No spam.</p>
            <div className="mt-4 text-slate-900">
              <Newsletter dark />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
