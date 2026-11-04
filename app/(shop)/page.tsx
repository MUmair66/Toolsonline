import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Headphones,
  MousePointerClick,
  PackageCheck,
  Phone,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";
import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { CATALOG_TAG, getSettings } from "@/lib/settings";
import { visibleWhere, withRatings } from "@/lib/products";
import { formatPrice, parseImages } from "@/lib/utils";
import { Newsletter } from "@/components/shop/Newsletter";
import { AddToCartBar } from "@/components/shop/ProductActions";
import { SafeImage } from "@/components/ui/SafeImage";
import { HeroSlider, type HeroSlide } from "@/components/home/HeroSlider";
import { ProductTabs, type ProductTab } from "@/components/home/ProductTabs";
import { ProductRail } from "@/components/home/ProductRail";

/* ---------- small helpers ---------- */

function SectionHeader({ eyebrow, title, subtitle, href, cta = "View all" }: { eyebrow?: string; title: string; subtitle?: string; href?: string; cta?: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
      <div>
        {eyebrow && <p className="text-sm font-semibold text-brand-600">{eyebrow}</p>}
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-2 max-w-2xl text-slate-500">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="group flex shrink-0 items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-950">
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
  { label: "Rs. 75,000 & above", min: 75000, max: null as number | null, note: "Industrial equipment" },
];

const HERO_TITLES = [
  (n: string) => `Professional ${n.toLowerCase()} for every job`,
  (n: string) => `${n} built for site work`,
  (n: string) => `Heavy-duty ${n.toLowerCase()}`,
  (n: string) => `Shop ${n.toLowerCase()} online`,
];

/**
 * All home-page data, cached so most visits don't touch the database at all (it's far away, and on
 * Neon's free plan it may be asleep). Product/category/brand/review edits and new orders clear it via
 * revalidateTag(CATALOG_TAG); otherwise it refreshes every 5 minutes.
 * Note: cached values are JSON, so dates come back as strings (only createdAt, handled below).
 */
const loadHomeData = unstable_cache(
  async (autoHideOutOfStock: boolean) => {
    const base = visibleWhere({ autoHideOutOfStock });
    const [productsRaw, categoriesRaw, catStats, brandsRaw, reviewAgg, reviews, ...budgetCounts] = await Promise.all([
      db.product.findMany({ where: base, include: { category: true, brand: true }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: 400 }),
      db.category.findMany({ orderBy: { name: "asc" } }),
      db.product.groupBy({ by: ["categoryId"], where: base, _count: { _all: true }, _min: { price: true }, _max: { price: true } }),
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
  ["home-data-v1"],
  { tags: [CATALOG_TAG], revalidate: 300 }
);

/* ---------- page ---------- */

export default async function HomePage() {
  const settings = await getSettings();
  const fmt = (n: number) => formatPrice(n, settings.currency);

  const { products, categoriesRaw, catStats, brandsRaw, reviewAgg, reviews, budgetCounts } = await loadHomeData(settings.autoHideOutOfStock);
  const withImg = products.filter((p) => parseImages(p.images)[0]);
  const img = (p: { images: string }) => parseImages(p.images)[0] ?? "";

  // Categories with live stats, biggest first.
  const categories = categoriesRaw
    .map((c) => {
      const s = catStats.find((x) => x.categoryId === c.id);
      return { ...c, count: s?._count._all ?? 0, min: s?._min.price ?? 0, max: s?._max.price ?? 0 };
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
  const brands = brandsRaw.filter((b) => b._count.products > 0);
  const productsIn = (catId: string) => withImg.filter((p) => p.categoryId === catId);
  const pickHero = (catId: string) => {
    const list = productsIn(catId);
    return list.find((p) => p.featured) ?? [...list].sort((a, b) => b.price - a.price)[0];
  };

  // Hero: one slide per top category.
  const slides: HeroSlide[] = categories
    .slice(0, 4)
    .map((c, i) => {
      const p = pickHero(c.id);
      if (!p) return null;
      return {
        key: c.slug,
        eyebrow: c.name,
        title: HERO_TITLES[i % HERO_TITLES.length](c.name),
        text: c.description ?? "",
        categoryHref: `/products?category=${c.slug}`,
        categoryCount: c.count,
        fromPrice: fmt(c.min),
        product: { name: p.name, href: `/products/${p.slug}`, image: img(p), price: fmt(p.price), specs: specsOf(p.description).slice(0, 3) },
      };
    })
    .filter((s): s is HeroSlide => !!s);
  const heroCats = new Set(slides.map((s) => s.key));

  // Tabs: the four largest categories.
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

  // Spotlight: the most premium featured machine (falls back to the priciest product).
  const spotlight = [...withImg].sort((a, b) => Number(b.featured) - Number(a.featured) || b.price - a.price)[0];
  const spotlightSpecs = spotlight ? specsOf(spotlight.description) : [];

  // Two promo banners from categories not already in the hero.
  const promos = categories
    .filter((c) => !heroCats.has(c.slug))
    .sort((a, b) => b.max - a.max)
    .slice(0, 2)
    .map((c) => ({ ...c, thumbs: productsIn(c.id).slice(0, 3) }));

  const newArrivals = [...products].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 12);
  const budgets = BUDGETS.map((b, i) => ({ ...b, count: budgetCounts[i] as number })).filter((b) => b.count > 0);
  const phone = settings.contactPhone;

  return (
    <>
      <h1 className="sr-only">
        {settings.storeName} — {settings.tagline}
      </h1>

      {/* 1. Hero slider */}
      <HeroSlider slides={slides} />

      {/* 2. Service highlights */}
      <section className="border-b border-slate-200 bg-white">
        <div className="container-x grid grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Truck,
              title: settings.freeShippingThreshold > 0 ? "Free delivery" : "Delivery",
              text: settings.freeShippingThreshold > 0 ? `On orders over ${fmt(settings.freeShippingThreshold)}` : `Flat ${fmt(settings.shippingFee)}`,
            },
            { icon: Banknote, title: "Cash on delivery", text: "Pay when it arrives" },
            { icon: ShieldCheck, title: "Secure checkout", text: "Card or COD" },
            { icon: Headphones, title: "Expert advice", text: "Help choosing a tool", href: "/contact" },
          ].map((f) => {
            const inner = (
              <>
                <f.icon className="h-6 w-6 shrink-0 text-slate-400 transition group-hover:text-brand-600" strokeWidth={1.75} />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{f.title}</span>
                  <span className="block text-xs text-slate-500">{f.text}</span>
                </span>
              </>
            );
            const cls = "group flex items-center gap-3 py-5 sm:gap-4 lg:justify-center";
            return f.href ? (
              <Link key={f.title} href={f.href} className={cls}>{inner}</Link>
            ) : (
              <div key={f.title} className={cls}>{inner}</div>
            );
          })}
        </div>
      </section>

      {/* 3. Categories */}
      {categories.length > 0 && (
        <section className="container-x py-16 sm:py-20">
          <SectionHeader eyebrow="Browse" title="Shop by category" subtitle="Every tool you need for construction, metalwork, woodwork and more." href="/categories" cta="All categories" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {categories.slice(0, 10).map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:shadow-md sm:p-4"
              >
                <div className="aspect-square w-full overflow-hidden rounded-xl bg-slate-50 p-3">
                  <SafeImage src={c.image} alt={c.name} className="h-full w-full object-contain mix-blend-multiply transition duration-500 group-hover:scale-105" />
                </div>
                <p className="mt-3 truncate text-sm font-semibold text-slate-900 sm:text-base">{c.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {c.count} products · from {fmt(c.min)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 4. Popular tools (tabs) */}
      {tabs.length > 0 && (
        <section className="border-y border-slate-200 bg-slate-50 py-16 sm:py-20">
          <div className="container-x">
            <SectionHeader eyebrow="Popular" title="Top tools by category" subtitle="Our most popular picks in each range." href="/products?featured=1" cta="See bestsellers" />
            <ProductTabs tabs={tabs} currency={settings.currency} />
          </div>
        </section>
      )}

      {/* 5. Spotlight */}
      {spotlight && (
        <section className="container-x py-16 sm:py-20">
          <div className="grid items-center gap-10 overflow-hidden rounded-3xl bg-slate-900 p-6 text-white sm:p-10 lg:grid-cols-2 lg:gap-14 lg:p-14">
            <Link href={`/products/${spotlight.slug}`} className="group relative block aspect-square overflow-hidden rounded-2xl bg-white">
              <SafeImage src={img(spotlight)} alt={spotlight.name} className="h-full w-full object-contain p-10 transition duration-700 group-hover:scale-[1.03]" />
            </Link>
            <div>
              <p className="text-sm font-semibold text-brand-400">Featured product</p>
              <p className="mt-3 text-sm text-slate-400">{[spotlight.brand?.name, spotlight.category?.name].filter(Boolean).join(" · ")}</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">{spotlight.name}</h2>
              {spotlightSpecs.length > 0 && (
                <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/10 pt-6">
                  {spotlightSpecs.slice(0, 4).map((s) => {
                    const [k, ...v] = s.split(":");
                    return (
                      <div key={s}>
                        <dt className="text-xs text-slate-400">{v.length ? k : "Feature"}</dt>
                        <dd className="mt-0.5 font-semibold">{v.length ? v.join(":").trim() : s}</dd>
                      </div>
                    );
                  })}
                </dl>
              )}
              <div className="mt-8 flex flex-wrap items-baseline gap-4">
                <p className="text-3xl font-bold">{fmt(spotlight.price)}</p>
                <span className={spotlight.stock > 0 ? "text-sm text-emerald-400" : "text-sm text-red-400"}>
                  {spotlight.stock > 0 ? "In stock" : "Out of stock"}
                </span>
              </div>
              <div className="mt-6 flex max-w-md flex-wrap gap-3">
                <div className="min-w-[12rem] flex-1">
                  <AddToCartBar
                    item={{ productId: spotlight.id, slug: spotlight.slug, name: spotlight.name, price: spotlight.price, image: img(spotlight), stock: spotlight.stock }}
                  />
                </div>
                <Link href={`/products/${spotlight.slug}`} className="btn border border-white/20 text-white hover:bg-white/10">
                  Full details <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. Shop by budget */}
      {budgets.length > 0 && (
        <section className="container-x pb-16 sm:pb-20">
          <SectionHeader eyebrow="Budget" title="Shop by price" subtitle="Find the right tool for your budget." />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {budgets.map((b) => (
              <Link
                key={b.label}
                href={`/products?${b.min ? `min=${b.min}&` : ""}${b.max ? `max=${b.max - 1}&` : ""}sort=price-asc`}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-md sm:p-6"
              >
                <p className="text-xs font-medium text-slate-500">{b.note}</p>
                <p className="mt-1.5 text-base font-bold text-slate-900 sm:text-lg">{b.label}</p>
                <p className="mt-5 flex items-center gap-1.5 text-sm font-medium text-slate-600 group-hover:text-slate-900">
                  {b.count} tools <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 7. Promo banners */}
      {promos.length > 0 && (
        <section className="container-x pb-16 sm:pb-20">
          <div className={`grid gap-4 sm:gap-6 ${promos.length > 1 ? "lg:grid-cols-2" : ""}`}>
            {promos.map((c, i) => (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                className={`group relative flex min-h-[240px] items-center gap-6 overflow-hidden rounded-2xl border p-6 sm:p-8 ${
                  i === 0 ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="relative z-10 flex min-w-0 flex-1 flex-col">
                  <p className="text-xs font-medium text-slate-500">{c.count} models</p>
                  <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{c.name}</h3>
                  {c.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{c.description}</p>}
                  <p className="mt-4 text-sm text-slate-600">
                    from <span className="text-lg font-bold text-slate-900">{fmt(c.min)}</span>
                  </p>
                  <span className="mt-4 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-slate-900">
                    Shop now <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
                <div className="aspect-square w-[40%] shrink-0 overflow-hidden rounded-xl bg-white p-3 shadow-sm">
                  <SafeImage
                    src={c.thumbs[0] ? img(c.thumbs[0]) : c.image}
                    alt={c.name}
                    className="h-full w-full object-contain transition duration-500 group-hover:scale-105"
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 8. New arrivals */}
      {newArrivals.length > 0 && (
        <section className="border-y border-slate-200 bg-slate-50 py-16 sm:py-20">
          <div className="container-x">
            <ProductRail products={newArrivals} currency={settings.currency} title="New arrivals" subtitle="The latest additions to our catalog." />
          </div>
        </section>
      )}

      {/* 9. How it works */}
      <section className="container-x py-16 sm:py-20">
        <SectionHeader eyebrow="Simple ordering" title="How ordering works" />
        <ol className="grid gap-8 md:grid-cols-3 md:gap-10">
          {[
            { icon: MousePointerClick, title: "Choose your tool", text: "Browse by category, brand or budget and compare the specifications." },
            { icon: PackageCheck, title: "Place your order", text: `Check out online in a minute${phone ? `, or call us on ${phone}` : ""}.` },
            { icon: Banknote, title: "Pay on delivery", text: "Pay cash when your order arrives, or pay by card at checkout." },
          ].map((s, i) => (
            <li key={s.title} className="border-t border-slate-200 pt-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold text-slate-400">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 10. Brands */}
      {brands.length > 0 && (
        <section className="container-x pb-16 sm:pb-20">
          <SectionHeader eyebrow="Brands" title="Brands we stock" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {brands.map((b) => (
              <Link
                key={b.id}
                href={`/products?brand=${b.slug}`}
                className="group flex h-24 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 transition hover:border-slate-300 hover:shadow-md"
              >
                {b.logo ? (
                  <SafeImage src={b.logo} alt={b.name} className="h-9 w-auto max-w-[60%] object-contain" />
                ) : (
                  <span className="truncate text-lg font-bold tracking-tight text-slate-900">{b.name}</span>
                )}
                <span className="flex shrink-0 items-center gap-1 text-xs text-slate-500 group-hover:text-slate-900">
                  {b._count.products} products <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 11. Reviews (only real ones) */}
      {reviews.length > 0 && (
        <section className="border-y border-slate-200 bg-slate-50 py-16 sm:py-20">
          <div className="container-x">
            <SectionHeader eyebrow="Reviews" title="What customers say" subtitle={`${reviewAgg._count} reviews · ${(reviewAgg._avg.rating ?? 0).toFixed(1)} average rating`} />
            <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
              {reviews.map((r) => (
                <figure key={r.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className={`h-4 w-4 ${i <= r.rating ? "fill-brand-400 text-brand-400" : "fill-slate-200 text-slate-200"}`} />
                    ))}
                  </div>
                  <blockquote className="mt-4 flex-1 leading-relaxed text-slate-700">&ldquo;{r.comment}&rdquo;</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">{r.user.name.charAt(0)}</span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                        {r.user.name} <BadgeCheck className="h-4 w-4 text-emerald-500" />
                      </p>
                      <Link href={`/products/${r.product.slug}`} className="block truncate text-xs text-slate-500 hover:text-slate-900">
                        on {r.product.name}
                      </Link>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 12. Newsletter + help */}
      <section className="container-x py-16 sm:py-20">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-5">
          <div className="rounded-2xl bg-slate-900 p-8 text-white sm:p-10 lg:col-span-3">
            <p className="text-sm font-semibold text-brand-400">Stay updated</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">Get new arrivals and offers first</h2>
            <p className="mt-2 text-slate-400">Join the {settings.storeName} mailing list. No spam.</p>
            <div className="mt-6 max-w-md text-slate-900">
              <Newsletter dark />
            </div>
          </div>
          <div className="flex flex-col justify-center rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 lg:col-span-2">
            <p className="text-sm font-semibold text-brand-600">Need help?</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Not sure which tool fits the job?</h2>
            <p className="mt-2 text-slate-500">Tell us what you&apos;re working on and we&apos;ll help you choose.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/contact" className="btn bg-slate-900 text-white hover:bg-slate-800">
                Contact us <ArrowRight className="h-4 w-4" />
              </Link>
              {phone && (
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="btn border border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900">
                  <Phone className="h-4 w-4" /> {phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
