import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Headphones,
  MousePointerClick,
  PackageCheck,
  Phone,
  Quote,
  ShieldCheck,
  Star,
  Truck,
  Wallet,
} from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
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
        {eyebrow && <p className="text-xs font-bold tracking-[0.2em] text-brand-600 uppercase">{eyebrow}</p>}
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">{title}</h2>
        {subtitle && <p className="mt-2 max-w-2xl text-slate-500">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="group flex shrink-0 items-center gap-1.5 text-sm font-bold text-slate-900 hover:text-brand-600">
          {cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
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

/* ---------- page ---------- */

export default async function HomePage() {
  const settings = await getSettings();
  const base = visibleWhere(settings);
  const fmt = (n: number) => formatPrice(n, settings.currency);

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

  const newArrivals = [...products].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 12);
  const budgets = BUDGETS.map((b, i) => ({ ...b, count: budgetCounts[i] as number })).filter((b) => b.count > 0);
  const phone = settings.contactPhone;

  return (
    <>
      <h1 className="sr-only">
        {settings.storeName} — {settings.tagline}
      </h1>

      {/* 1. Hero slider */}
      <HeroSlider slides={slides} />

      {/* 2. Category marquee */}
      {categories.length > 0 && (
        <div className="overflow-hidden bg-brand-400 py-3 text-slate-950" aria-hidden>
          <div className="animate-marquee flex w-max gap-10 whitespace-nowrap">
            {[...categories, ...categories].map((c, i) => (
              <span key={i} className="flex items-center gap-10 text-sm font-extrabold tracking-wider uppercase">
                {c.name}
                <span className="text-slate-950/40">✦</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 3. Service highlights */}
      <section className="border-b border-slate-200 bg-white">
        <div className="container-x grid grid-cols-2 gap-px overflow-hidden lg:grid-cols-4">
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
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-brand-400 transition group-hover:bg-brand-400 group-hover:text-slate-950">
                  <f.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-900">{f.title}</span>
                  <span className="block text-xs text-slate-500">{f.text}</span>
                </span>
              </>
            );
            const cls = "group flex items-center gap-3 py-6 sm:gap-4 lg:justify-center";
            return f.href ? (
              <Link key={f.title} href={f.href} className={cls}>{inner}</Link>
            ) : (
              <div key={f.title} className={cls}>{inner}</div>
            );
          })}
        </div>
      </section>

      {/* 4. Categories */}
      {categories.length > 0 && (
        <section className="bg-slate-50 py-16 sm:py-20">
          <div className="container-x">
            <SectionHeader eyebrow="Browse" title="Shop by category" subtitle="Every tool you need for construction, metalwork, woodwork and more." href="/categories" cta="All categories" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
              {categories.slice(0, 10).map((c) => (
                <Link
                  key={c.id}
                  href={`/products?category=${c.slug}`}
                  className="group relative flex flex-col overflow-hidden rounded-3xl bg-white p-4 ring-1 ring-slate-200 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-brand-400 sm:p-5"
                >
                  <span className="absolute top-3 right-3 flex h-8 w-8 translate-x-2 items-center justify-center rounded-full bg-brand-400 text-slate-950 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                  <div className="mx-auto aspect-square w-full max-w-[160px]">
                    <SafeImage src={c.image} alt={c.name} className="h-full w-full object-contain transition duration-500 group-hover:scale-110" />
                  </div>
                  <p className="mt-3 font-bold text-slate-900">{c.name}</p>
                  <p className="mt-0.5 flex items-center justify-between text-xs text-slate-500">
                    <span>{c.count} products</span>
                    <span className="font-semibold text-slate-700">from {fmt(c.min)}</span>
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. Popular tools (tabs) */}
      {tabs.length > 0 && (
        <section className="container-x py-16 sm:py-20">
          <SectionHeader eyebrow="Popular" title="Top tools by category" subtitle="Our most popular picks in each range." href="/products?featured=1" cta="See bestsellers" />
          <ProductTabs tabs={tabs} currency={settings.currency} />
        </section>
      )}

      {/* 6. Spotlight */}
      {spotlight && (
        <section className="relative overflow-hidden bg-slate-950 py-16 text-white sm:py-20">
          <div className="bg-dots-dark pointer-events-none absolute inset-0" />
          <div className="pointer-events-none absolute top-1/2 right-0 h-[30rem] w-[30rem] -translate-y-1/2 rounded-full bg-brand-400/15 blur-3xl" />
          <div className="container-x relative grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <Link href={`/products/${spotlight.slug}`} className="group relative block aspect-square overflow-hidden rounded-[2rem] bg-white shadow-2xl">
              <span className="absolute top-5 left-5 z-10 rounded-full bg-slate-950 px-3 py-1 text-xs font-bold tracking-wider text-brand-400 uppercase">Spotlight</span>
              <SafeImage src={img(spotlight)} alt={spotlight.name} className="h-full w-full object-contain p-10 transition duration-700 group-hover:scale-105" />
            </Link>
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-brand-400 uppercase">
                {[spotlight.brand?.name, spotlight.category?.name].filter(Boolean).join(" · ")}
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">{spotlight.name}</h2>
              {spotlightSpecs.length > 0 && (
                <dl className="mt-8 grid grid-cols-2 gap-3">
                  {spotlightSpecs.slice(0, 4).map((s) => {
                    const [k, ...v] = s.split(":");
                    return (
                      <div key={s} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                        <dt className="text-xs text-slate-400">{v.length ? k : "Feature"}</dt>
                        <dd className="mt-1 text-lg font-bold">{v.length ? v.join(":").trim() : s}</dd>
                      </div>
                    );
                  })}
                </dl>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <p className="text-4xl font-extrabold text-brand-400">{fmt(spotlight.price)}</p>
                <span className={spotlight.stock > 0 ? "text-sm font-medium text-emerald-400" : "text-sm font-medium text-red-400"}>
                  {spotlight.stock > 0 ? "● In stock" : "● Out of stock"}
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

      {/* 7. Shop by budget */}
      {budgets.length > 0 && (
        <section className="container-x py-16 sm:py-20">
          <SectionHeader eyebrow="Budget" title="Shop by price" subtitle="Find the right tool for your budget." />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {budgets.map((b, i) => (
              <Link
                key={b.label}
                href={`/products?${b.min ? `min=${b.min}&` : ""}${b.max ? `max=${b.max - 1}&` : ""}sort=price-asc`}
                className={`group relative overflow-hidden rounded-3xl p-5 transition hover:-translate-y-1 hover:shadow-xl sm:p-6 ${
                  i % 2 === 0 ? "bg-slate-950 text-white" : "bg-brand-400 text-slate-950"
                }`}
              >
                <Wallet className={`absolute -right-4 -bottom-4 h-24 w-24 rotate-12 ${i % 2 === 0 ? "text-white/5" : "text-slate-950/10"}`} />
                <p className={`text-xs font-semibold tracking-wider uppercase ${i % 2 === 0 ? "text-brand-400" : "text-slate-800"}`}>{b.note}</p>
                <p className="mt-2 text-lg font-extrabold sm:text-xl">{b.label}</p>
                <p className={`mt-6 flex items-center gap-1.5 text-sm font-semibold ${i % 2 === 0 ? "text-slate-300" : "text-slate-800"}`}>
                  {b.count} tools <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 8. Promo banners */}
      {promos.length > 0 && (
        <section className="container-x pb-16 sm:pb-20">
          <div className={`grid gap-4 sm:gap-6 ${promos.length > 1 ? "lg:grid-cols-2" : ""}`}>
            {promos.map((c, i) => (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                className={`group relative flex min-h-[260px] overflow-hidden rounded-[2rem] p-7 sm:p-10 ${i === 0 ? "bg-brand-400 text-slate-950" : "bg-slate-950 text-white"}`}
              >
                {i === 1 && <div className="bg-dots-dark pointer-events-none absolute inset-0" />}
                <div className="relative z-10 flex max-w-[55%] flex-col">
                  <p className={`text-xs font-bold tracking-[0.2em] uppercase ${i === 0 ? "text-slate-800" : "text-brand-400"}`}>{c.count} models</p>
                  <h3 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{c.name}</h3>
                  <p className={`mt-2 line-clamp-2 text-sm ${i === 0 ? "text-slate-800" : "text-slate-400"}`}>{c.description}</p>
                  <p className="mt-auto pt-6 text-sm">
                    from <span className="text-2xl font-extrabold">{fmt(c.min)}</span>
                  </p>
                  <span className={`mt-4 inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition ${i === 0 ? "bg-slate-950 text-white group-hover:bg-slate-800" : "bg-brand-400 text-slate-950 group-hover:bg-brand-300"}`}>
                    Shop now <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
                <div className="absolute top-1/2 right-4 w-[45%] -translate-y-1/2 sm:right-8">
                  <div className="aspect-square overflow-hidden rounded-3xl bg-white p-4 shadow-2xl transition duration-500 group-hover:scale-105 group-hover:-rotate-2">
                    <SafeImage src={c.thumbs[0] ? img(c.thumbs[0]) : c.image} alt={c.name} className="h-full w-full object-contain" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 9. New arrivals */}
      {newArrivals.length > 0 && (
        <section className="bg-slate-50 py-16 sm:py-20">
          <div className="container-x">
            <ProductRail products={newArrivals} currency={settings.currency} title="New arrivals" subtitle="The latest additions to our catalog." />
          </div>
        </section>
      )}

      {/* 10. How it works */}
      <section className="container-x py-16 sm:py-20">
        <SectionHeader eyebrow="Simple ordering" title="How ordering works" />
        <ol className="grid gap-4 sm:gap-6 md:grid-cols-3">
          {[
            { icon: MousePointerClick, title: "Choose your tool", text: "Browse by category, brand or budget and compare the specifications." },
            { icon: PackageCheck, title: "Place your order", text: `Check out online in a minute${phone ? `, or call us on ${phone}` : ""}.` },
            { icon: Banknote, title: "Pay on delivery", text: "Pay cash when your order arrives, or pay by card at checkout." },
          ].map((s, i) => (
            <li key={s.title} className="relative overflow-hidden rounded-3xl bg-white p-7 ring-1 ring-slate-200">
              <span className="absolute -top-4 -right-1 text-8xl font-black text-slate-100">{i + 1}</span>
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-400 text-slate-950">
                <s.icon className="h-6 w-6" />
              </span>
              <h3 className="relative mt-5 text-lg font-bold">{s.title}</h3>
              <p className="relative mt-2 text-sm text-slate-500">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 11. Brands */}
      {brands.length > 0 && (
        <section className="container-x pb-16 sm:pb-20">
          <SectionHeader eyebrow="Brands" title="Brands we stock" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {brands.map((b) => (
              <Link
                key={b.id}
                href={`/products?brand=${b.slug}`}
                className="group relative flex h-28 items-center justify-between overflow-hidden rounded-3xl bg-slate-950 px-6 text-white transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="bg-hazard pointer-events-none absolute inset-x-0 bottom-0 h-1" />
                {b.logo ? (
                  <SafeImage src={b.logo} alt={b.name} className="h-10 w-auto object-contain" />
                ) : (
                  <span className="text-3xl font-black tracking-tight text-brand-400 italic">{b.name}</span>
                )}
                <span className="text-right text-xs text-slate-400">
                  {b._count.products} products
                  <ArrowRight className="mt-1 ml-auto h-4 w-4 text-brand-400 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 12. Reviews (only real ones) */}
      {reviews.length > 0 && (
        <section className="bg-slate-50 py-16 sm:py-20">
          <div className="container-x">
            <SectionHeader eyebrow="Reviews" title="What customers say" subtitle={`${reviewAgg._count} reviews · ${(reviewAgg._avg.rating ?? 0).toFixed(1)} average rating`} />
            <div className="grid gap-6 md:grid-cols-3">
              {reviews.map((r) => (
                <figure key={r.id} className="relative rounded-3xl bg-white p-7 ring-1 ring-slate-200">
                  <Quote className="absolute top-6 right-6 h-8 w-8 text-brand-200" />
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className={`h-4 w-4 ${i <= r.rating ? "fill-brand-400 text-brand-400" : "fill-slate-200 text-slate-200"}`} />
                    ))}
                  </div>
                  <blockquote className="mt-4 text-slate-700">&ldquo;{r.comment}&rdquo;</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-brand-400">{r.user.name.charAt(0)}</span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 text-sm font-semibold">
                        {r.user.name} <BadgeCheck className="h-4 w-4 text-emerald-500" />
                      </p>
                      <Link href={`/products/${r.product.slug}`} className="block truncate text-xs text-slate-500 hover:text-brand-600">
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

      {/* 13. Newsletter + help */}
      <section className="container-x pt-4 pb-6">
        <div className="grid overflow-hidden rounded-[2rem] ring-1 ring-slate-200 lg:grid-cols-5">
          <div className="relative bg-slate-950 p-8 text-white sm:p-12 lg:col-span-3">
            <div className="bg-dots-dark pointer-events-none absolute inset-0" />
            <div className="relative">
              <p className="text-xs font-bold tracking-[0.2em] text-brand-400 uppercase">Stay updated</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Get new arrivals and offers first</h2>
              <p className="mt-2 text-slate-400">Join the {settings.storeName} mailing list. No spam.</p>
              <div className="mt-6 max-w-md text-slate-900">
                <Newsletter dark />
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center bg-brand-400 p-8 text-slate-950 sm:p-12 lg:col-span-2">
            <p className="text-xs font-bold tracking-[0.2em] uppercase">Need help?</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Not sure which tool fits the job?</h2>
            <p className="mt-2 text-slate-800">Tell us what you&apos;re working on and we&apos;ll help you choose.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/contact" className="btn bg-slate-950 text-white hover:bg-slate-800">
                Contact us <ArrowRight className="h-4 w-4" />
              </Link>
              {phone && (
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="btn border border-slate-950/20 text-slate-950 hover:bg-slate-950/5">
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
