import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Check,
  ChevronDown,
  Clock,
  Headphones,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { CATALOG_TAG, getSettings } from "@/lib/settings";
import { visibleWhere, withRatings } from "@/lib/products";
import { formatPrice, parseImages } from "@/lib/utils";
import { STORE, telHref, whatsappHref } from "@/lib/store";
import { Newsletter } from "@/components/shop/Newsletter";
import { AddToCartBar } from "@/components/shop/ProductActions";
import { SafeImage } from "@/components/ui/SafeImage";
import { HeroSlider, type HeroSlide } from "@/components/home/HeroSlider";
import { ProductTabs, type ProductTab } from "@/components/home/ProductTabs";
import { ProductRail } from "@/components/home/ProductRail";

/* ---------- small helpers ---------- */

function SectionHeader({ eyebrow, title, subtitle, href, cta = "View all" }: { eyebrow?: string; title: string; subtitle?: string; href?: string; cta?: string }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-xs font-bold tracking-[0.14em] text-brand-700 uppercase">{eyebrow}</p>}
        <h2 className="mt-1.5 text-2xl leading-tight font-extrabold tracking-tight text-slate-900 sm:text-[30px]">{title}</h2>
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
/** Plain-text intro of a description (everything before the spec bullets). */
function introOf(description: string) {
  return description
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("•"))
    .join(" ")
    .replace(/\s*(Key\s+)?(Specifications|Specs|Features)\s*:?\s*$/i, "")
    .trim();
}

const BUDGETS = [
  { label: "Under Rs. 5,000", min: 0, max: 5000, note: "Everyday essentials" },
  { label: "Rs. 5,000 – 20,000", min: 5000, max: 20000, note: "Workshop favourites" },
  { label: "Rs. 20,000 – 75,000", min: 20000, max: 75000, note: "Heavy-duty machines" },
  { label: "Rs. 75,000+", min: 75000, max: null as number | null, note: "Industrial equipment" },
];

const THEMES: HeroSlide["theme"][] = ["dark", "yellow", "mint", "yellow"];

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
  ["home-data-v2"],
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
  const catImage = (c: (typeof categories)[number]) => (productsIn(c.id)[0] ? img(productsIn(c.id)[0]) : c.image);

  // Hero slides: alternate product slides and category slides across the top categories.
  const slides: HeroSlide[] = categories
    .slice(0, 4)
    .map((c, i): HeroSlide | null => {
      const p = pickHero(c.id);
      if (!p) return null;
      const specs = specsOf(p.description).slice(0, 3);
      return i % 2 === 0
        ? {
            key: p.slug,
            theme: THEMES[i],
            eyebrow: c.name,
            title: p.name,
            text: specs.length ? specs.join(" · ") : introOf(p.description),
            price: fmt(p.price),
            href: `/products/${p.slug}`,
            image: img(p),
            alt: p.name,
          }
        : {
            key: c.slug,
            theme: THEMES[i],
            eyebrow: `${c.count} models`,
            title: `${c.name} for every job`,
            text: c.description ?? "",
            price: `From ${fmt(c.min)}`,
            href: `/products?category=${c.slug}`,
            image: img(p),
            alt: c.name,
          };
    })
    .filter((s): s is HeroSlide => !!s);
  const heroCats = new Set(categories.slice(0, 4).map((c) => c.slug));

  // Two side tiles next to the slider: a premium product and a category, both outside the slides.
  const otherCats = categories.filter((c) => !heroCats.has(c.slug));
  const sideProduct = [...withImg].filter((p) => p.category && !heroCats.has(p.category.slug)).sort((a, b) => Number(b.featured) - Number(a.featured) || b.price - a.price)[0];
  const sideCat = otherCats.find((c) => c.id !== sideProduct?.categoryId && productsIn(c.id).length);

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
  const spotlightSpecs = spotlight ? specsOf(spotlight.description).slice(0, 3) : [];

  // Two promo banners: categories not in the hero or the side tiles, most premium first.
  const used = new Set([...heroCats, sideCat?.slug, sideProduct?.category?.slug].filter(Boolean));
  const promos = categories
    .filter((c) => !used.has(c.slug))
    .sort((a, b) => b.max - a.max)
    .slice(0, 2)
    .map((c) => ({ ...c, thumb: productsIn(c.id).sort((a, b) => b.price - a.price)[0] }));

  // Only products with a photo and in stock, so the rail never shows empty placeholders or "Sold out".
  const newArrivals = withImg
    .filter((p) => p.stock > 0)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12);
  const budgets = BUDGETS.map((b, i) => ({ ...b, count: budgetCounts[i] })).filter((b) => b.count > 0);
  const totalProducts = products.length; // every visible product, including ones without a category
  const freeShip = settings.freeShippingThreshold > 0 ? fmt(settings.freeShippingThreshold) : null;

  const faqs = [
    {
      q: "How do I pay for my order?",
      a: "You can pay cash on delivery when your order arrives, or pay by card at checkout.",
    },
    {
      q: "How much is delivery?",
      a: freeShip
        ? `Delivery is free on orders over ${freeShip}. Smaller orders have a flat delivery fee of ${fmt(settings.shippingFee)}, shown at checkout.`
        : `Delivery is a flat ${fmt(settings.shippingFee)}, shown at checkout before you pay.`,
    },
    {
      q: "How can I track my order?",
      a: "Sign in and open My account → My orders to see the status of every order. You can also call us with your order number.",
    },
    {
      q: "Not sure which tool to buy?",
      a: `Call us on ${STORE.phones[0]} or message us on WhatsApp. Tell us what you are working on and we will recommend the right tool.`,
    },
  ];

  return (
    <div className="bg-slate-50/60">
      <h1 className="sr-only">
        {settings.storeName} — {settings.tagline}
      </h1>

      {/* 1. Hero: category list · slider · two promo tiles */}
      <section className="container-x pt-4 pb-2 sm:pt-5">
        <div className="grid gap-4 md:grid-cols-[1fr_240px] xl:grid-cols-[240px_1fr_260px]">
          <nav aria-label="Shop by category" className="hidden rounded-2xl border border-slate-200 bg-white py-2 xl:block">
            <p className="px-4 pt-2 pb-1.5 text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Categories</p>
            <ul>
              {categories.slice(0, 10).map((c) => (
                <li key={c.id}>
                  <Link href={`/products?category=${c.slug}`} className="flex items-center justify-between gap-2 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-brand-50 hover:text-slate-950">
                    <span className="truncate">{c.name}</span>
                    <span className="text-xs text-slate-400">{c.count}</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/categories" className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-brand-50">
                  All categories <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
            </ul>
          </nav>

          <HeroSlider slides={slides} />

          <div className="grid grid-cols-2 gap-3 md:grid-cols-1 md:grid-rows-2 md:gap-4">
            {sideProduct && (
              <SideTile
                href={`/products/${sideProduct.slug}`}
                tone="yellow"
                eyebrow={sideProduct.category?.name ?? "Featured"}
                title={sideProduct.name}
                price={fmt(sideProduct.price)}
                image={img(sideProduct)}
              />
            )}
            {sideCat && (
              <SideTile
                href={`/products?category=${sideCat.slug}`}
                tone="white"
                eyebrow={`${sideCat.count} models`}
                title={sideCat.name}
                price={`From ${fmt(sideCat.min)}`}
                image={catImage(sideCat) ?? ""}
              />
            )}
          </div>
        </div>
      </section>

      {/* 2. Trust bar */}
      <section className="mt-4 border-y border-slate-200 bg-white">
        {/* 1px gaps over a grey background draw the divider lines at every screen size. */}
        <div className="container-x grid grid-cols-2 gap-px bg-slate-200 !px-0 lg:grid-cols-4">
          {[
            { icon: Truck, title: freeShip ? "Free delivery" : "Fast delivery", text: freeShip ? `Orders over ${freeShip}` : `Flat ${fmt(settings.shippingFee)}` },
            { icon: Banknote, title: "Cash on delivery", text: "Pay when it arrives" },
            { icon: ShieldCheck, title: "Secure checkout", text: "Card or cash" },
            { icon: Headphones, title: "Expert advice", text: "Help choosing a tool", href: "/contact" },
          ].map((f) => {
            const inner = (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 sm:h-11 sm:w-11">
                  <f.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900 sm:text-[15px]">{f.title}</span>
                  <span className="block text-xs leading-snug text-slate-500 sm:text-[13px]">{f.text}</span>
                </span>
              </>
            );
            const cls = "flex items-center gap-3 bg-white px-4 py-4 sm:gap-3.5 sm:px-6 sm:py-5";
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
        <section className="container-x py-12 sm:py-14">
          <SectionHeader eyebrow="Browse" title="Shop by category" subtitle="Tools for construction, metalwork, woodwork and more." href="/categories" cta="All categories" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {categories.slice(0, 10).map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-3 transition duration-200 hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-[0_12px_30px_-10px_rgba(15,23,42,0.15)] sm:p-4"
              >
                <span className="absolute top-3 right-3 z-10 hidden h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition group-hover:bg-brand-400 group-hover:text-slate-950 sm:flex">
                  <ArrowRight className="h-4 w-4" />
                </span>
                <span className="block h-28 sm:h-32">
                  <SafeImage src={catImage(c)} alt={c.name} className="h-full w-full object-contain mix-blend-multiply transition duration-300 group-hover:scale-105" />
                </span>
                <span className="mt-3 line-clamp-2 text-sm leading-snug font-bold text-slate-900 sm:text-[15px]">{c.name}</span>
                <span className="mt-0.5 text-xs text-slate-500 sm:text-[13px]">
                  {c.count} products · from {fmt(c.min)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 4. Promo banners */}
      {promos.length > 0 && (
        <section className="container-x">
          <div className={`grid gap-4 sm:gap-5 ${promos.length > 1 ? "lg:grid-cols-2" : ""}`}>
            {promos.map((c, i) => {
              const dark = i === 0;
              return (
                <Link
                  key={c.id}
                  href={`/products?category=${c.slug}`}
                  className={`group grid min-h-[240px] items-center gap-4 overflow-hidden rounded-[20px] p-6 sm:grid-cols-[1.1fr_1fr] sm:p-8 ${
                    dark ? "bg-gradient-to-br from-slate-950 to-slate-800 text-white" : "bg-gradient-to-br from-[#ffe46b] to-brand-400 text-slate-950"
                  }`}
                >
                  <div className="order-2 sm:order-1">
                    <p className="text-xs font-bold tracking-[0.12em] uppercase opacity-75">{c.count} models</p>
                    <h3 className="mt-2 text-2xl leading-tight font-extrabold tracking-tight sm:text-[26px]">{c.name}</h3>
                    {c.description && <p className="mt-2 line-clamp-2 text-sm opacity-80">{c.description}</p>}
                    <p className="mt-3 text-lg font-extrabold">From {fmt(c.min)}</p>
                    <span
                      className={`mt-4 inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold transition ${
                        dark ? "bg-brand-400 text-slate-950 group-hover:bg-brand-300" : "bg-slate-950 text-white group-hover:bg-black"
                      }`}
                    >
                      Shop now <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </div>
                  <span className={`order-1 mx-auto block aspect-square w-36 rounded-2xl p-3 sm:order-2 sm:ml-auto sm:w-full sm:max-w-[210px] ${dark ? "bg-white" : "bg-white/60"}`}>
                    <SafeImage
                      src={c.thumb ? img(c.thumb) : c.image}
                      alt={c.name}
                      className="h-full w-full object-contain mix-blend-multiply transition duration-500 group-hover:scale-105"
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. Bestsellers by category (tabs) */}
      {tabs.length > 0 && (
        <section className="container-x py-12 sm:py-14">
          <SectionHeader eyebrow="Popular" title="Bestselling tools" subtitle="The tools our customers order most." href="/products?featured=1" cta="See all bestsellers" />
          <ProductTabs tabs={tabs} currency={settings.currency} />
        </section>
      )}

      {/* 6. Spotlight */}
      {spotlight && (
        <section className="container-x">
          <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white lg:grid-cols-2">
            <Link
              href={`/products/${spotlight.slug}`}
              className="relative flex items-center justify-center bg-[radial-gradient(circle_at_50%_55%,#fff6c7,#f6f7f9_65%)] p-8 sm:p-10"
            >
              <span className="absolute top-5 left-5 rounded-md bg-brand-400 px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-slate-950 uppercase">Featured</span>
              <span className="block aspect-square w-full max-w-[340px]">
                <SafeImage src={img(spotlight)} alt={spotlight.name} className="h-full w-full object-contain mix-blend-multiply" />
              </span>
            </Link>
            <div className="p-6 sm:p-10 lg:p-12">
              <p className="text-xs font-bold tracking-[0.14em] text-brand-700 uppercase">
                {[spotlight.brand?.name, spotlight.category?.name].filter(Boolean).join(" · ")}
              </p>
              <h2 className="mt-2.5 text-2xl leading-tight font-extrabold tracking-tight sm:text-[34px]">{spotlight.name}</h2>
              {introOf(spotlight.description) && <p className="mt-2 line-clamp-3 text-[15px] text-slate-500">{introOf(spotlight.description)}</p>}
              {spotlightSpecs.length > 0 && (
                <dl className="mt-6 grid grid-cols-3 gap-2 sm:gap-2.5">
                  {spotlightSpecs.map((s) => {
                    const [k, ...v] = s.split(":");
                    return (
                      <div key={s} className="rounded-xl bg-slate-50 p-3 sm:p-3.5">
                        <dt className="truncate text-[11px] text-slate-500 sm:text-xs">{v.length ? k : "Feature"}</dt>
                        <dd className="mt-0.5 text-sm font-bold sm:text-lg">{v.length ? v.join(":").trim() : s}</dd>
                      </div>
                    );
                  })}
                </dl>
              )}
              <ul className="mt-6 space-y-2 text-sm text-slate-700">
                {[
                  "Cash on delivery available",
                  freeShip ? `Free delivery on orders over ${freeShip}` : "Delivery to your door",
                  "Expert advice before you buy",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={3} /> {t}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
                <div>
                  <p className="text-3xl font-extrabold">{fmt(spotlight.price)}</p>
                  <p className={spotlight.stock > 0 ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-red-600"}>
                    ● {spotlight.stock > 0 ? "In stock" : "Out of stock"}
                  </p>
                </div>
                <div className="w-full max-w-[220px]">
                  <AddToCartBar item={{ productId: spotlight.id, slug: spotlight.slug, name: spotlight.name, price: spotlight.price, image: img(spotlight), stock: spotlight.stock }} />
                </div>
                <Link href={`/products/${spotlight.slug}`} className="inline-flex items-center gap-1.5 border-b-2 border-brand-400 pb-0.5 text-sm font-semibold">
                  Full details <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 7. Shop by price */}
      {budgets.length > 0 && (
        <section className="container-x py-12 sm:py-14">
          <SectionHeader eyebrow="Budget" title="Shop by price" subtitle="Find the right tool for your budget." />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {budgets.map((b) => (
              <Link
                key={b.label}
                href={`/products?${b.min ? `min=${b.min}&` : ""}${b.max ? `max=${b.max - 1}&` : ""}sort=price-asc`}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition duration-200 hover:border-slate-950 hover:bg-slate-950 hover:text-white sm:p-6"
              >
                <span className="self-start rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-800 group-hover:bg-brand-400 group-hover:text-slate-950">{b.count} tools</span>
                <span className="mt-3 text-lg leading-tight font-extrabold sm:text-[22px]">{b.label}</span>
                <span className="mt-1 text-[13px] text-slate-500 group-hover:text-slate-400">{b.note}</span>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold">
                  Shop <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 8. New arrivals */}
      {newArrivals.length > 0 && (
        <section className="border-y border-slate-200 bg-white py-12 sm:py-14">
          <div className="container-x">
            <ProductRail products={newArrivals} currency={settings.currency} title="New arrivals" subtitle="The latest additions to our catalog." />
          </div>
        </section>
      )}

      {/* 9. Brands + how ordering works */}
      <section className="container-x py-12 sm:py-14">
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-[1fr_1.4fr]">
          {brands.length > 0 && (
            <div className="rounded-[20px] border border-slate-200 bg-white p-6 sm:p-8">
              <p className="text-xs font-bold tracking-[0.14em] text-brand-700 uppercase">Brands</p>
              <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-[28px]">Brands we stock</h2>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {brands.map((b) => (
                  <Link key={b.id} href={`/products?brand=${b.slug}`} className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 p-5 text-center transition hover:border-brand-400 hover:bg-brand-50/50">
                    {b.logo ? (
                      <span className="block h-10 w-full">
                        <SafeImage src={b.logo} alt={b.name} className="h-full w-full object-contain" />
                      </span>
                    ) : (
                      <span className="text-2xl font-black tracking-wide">{b.name}</span>
                    )}
                    <span className="mt-1 text-[13px] text-slate-500">{b._count.products} products</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div className={`rounded-[20px] border border-slate-200 bg-white p-6 sm:p-8 ${brands.length ? "" : "lg:col-span-2"}`}>
            <p className="text-xs font-bold tracking-[0.14em] text-brand-700 uppercase">Simple ordering</p>
            <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-[28px]">How ordering works</h2>
            <ol className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { title: "Choose your tool", text: "Browse by category, brand or budget and compare the specifications." },
                { title: "Place your order", text: `Check out online in a minute, or call us on ${STORE.phones[0]}.` },
                { title: "Pay on delivery", text: "Pay cash when your order arrives, or pay by card at checkout." },
              ].map((s, i) => (
                <li key={s.title} className="rounded-2xl bg-slate-50 p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-400 font-extrabold text-slate-950">{i + 1}</span>
                  <h3 className="mt-3 font-bold">{s.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 10. Store in numbers */}
      <section className="bg-slate-950 text-white">
        <div className="container-x grid grid-cols-2 gap-y-8 py-10 sm:py-12 lg:grid-cols-4">
          {[
            { value: totalProducts.toLocaleString(), label: "Products" },
            { value: categories.length.toString(), label: "Categories" },
            { value: brands.length.toString(), label: brands.length === 1 ? "Brand" : "Brands" },
            { value: "COD", label: "Cash on delivery" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-extrabold text-brand-400 sm:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 11. Reviews (only real ones) */}
      {reviews.length > 0 && (
        <section className="container-x py-12 sm:py-14">
          <SectionHeader eyebrow="Reviews" title="What customers say" subtitle={`${reviewAgg._count} reviews · ${(reviewAgg._avg.rating ?? 0).toFixed(1)} average rating`} />
          <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
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
                    <p className="flex items-center gap-1 text-sm font-semibold">
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
        </section>
      )}

      {/* 12. Visit our store */}
      <section className="container-x py-12 sm:py-14">
        <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white lg:grid-cols-[1fr_1.2fr]">
          <div className="p-6 sm:p-10">
            <p className="text-xs font-bold tracking-[0.14em] text-brand-700 uppercase">Visit us</p>
            <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-[30px]">Our store in {STORE.city}</h2>
            <p className="mt-2 text-[15px] text-slate-500">See the tools in person, or call us and we will help you choose.</p>
            <ul className="mt-6 space-y-4 text-sm">
              <li className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><MapPin className="h-5 w-5" /></span>
                <span>
                  <span className="block font-semibold text-slate-900">Address</span>
                  <a href={STORE.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-950 hover:underline">{STORE.address}</a>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Phone className="h-5 w-5" /></span>
                <span>
                  <span className="block font-semibold text-slate-900">Phone</span>
                  {STORE.phones.map((p) => (
                    <a key={p} href={telHref(p)} className="block text-slate-600 hover:text-slate-950 hover:underline">{p}</a>
                  ))}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Clock className="h-5 w-5" /></span>
                <span>
                  <span className="block font-semibold text-slate-900">Opening hours</span>
                  <span className="text-slate-600">{STORE.hours}</span>
                </span>
              </li>
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#25D366] px-5 text-[15px] font-bold text-white transition hover:bg-[#1ebe5a]">
                <MessageCircle className="h-5 w-5" /> WhatsApp us
              </a>
              <a href={STORE.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-300 px-5 text-[15px] font-bold text-slate-900 transition hover:border-slate-400">
                <MapPin className="h-5 w-5" /> Get directions
              </a>
            </div>
          </div>
          <div className="relative min-h-[300px] bg-slate-100">
            <iframe
              src={STORE.mapsEmbed}
              title={`Map: ${STORE.address}`}
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {/* 13. FAQ */}
      <section className="container-x pb-12 sm:pb-14">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-xs font-bold tracking-[0.14em] text-brand-700 uppercase">FAQ</p>
            <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-[30px]">Frequently asked questions</h2>
          </div>
          <div className="mt-7 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {faqs.map((f) => (
              <details key={f.q} className="group px-5 sm:px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
                </summary>
                <p className="pb-5 text-[15px] leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 14. Help + newsletter band */}
      <section className="container-x pb-4">
        <div className="relative grid items-center gap-8 overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:gap-10 lg:p-11">
          <div className="pointer-events-none absolute -top-32 -right-32 h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(245,211,58,0.25),transparent_70%)]" />
          <div className="relative">
            <p className="text-xs font-bold tracking-[0.14em] text-brand-400 uppercase">Need help?</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-[30px]">Not sure which tool fits the job?</h2>
            <p className="mt-2 text-slate-400">Tell us what you are working on. Our team will recommend the right tool.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={telHref(STORE.phones[0])} className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-400 px-5 text-[15px] font-bold text-slate-950 transition hover:bg-brand-300">
                <Phone className="h-4 w-4" /> {STORE.phones[0]}
              </a>
              <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/25 px-5 text-[15px] font-bold text-white transition hover:bg-white/10">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          </div>
          <div className="relative rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
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

/** Small promo tile beside the hero slider. The image box has a fixed size so photos never squash. */
function SideTile({ href, tone, eyebrow, title, price, image }: { href: string; tone: "yellow" | "white"; eyebrow: string; title: string; price: string; image: string }) {
  return (
    <Link
      href={href}
      className={`group relative flex min-h-[170px] flex-col justify-between overflow-hidden rounded-2xl border p-4 transition hover:shadow-md sm:p-5 ${
        tone === "yellow" ? "border-[#f6e7a3] bg-[#fff8d6]" : "border-slate-200 bg-white"
      }`}
    >
      <div className="relative z-10 max-w-[60%]">
        <p className="truncate text-[11px] font-bold tracking-[0.08em] text-brand-700 uppercase sm:text-xs">{eyebrow}</p>
        <p className="mt-1 line-clamp-3 text-sm leading-snug font-bold text-slate-900 sm:text-[17px]">{title}</p>
        <p className="mt-1.5 text-sm font-extrabold text-slate-900 sm:text-base">{price}</p>
      </div>
      <span className="relative z-10 self-start border-b-2 border-brand-400 text-[13px] font-bold">Shop now</span>
      <span className="absolute right-2 bottom-2 block h-[58%] w-[42%]">
        <SafeImage src={image} alt="" className="h-full w-full object-contain mix-blend-multiply transition duration-300 group-hover:scale-105" />
      </span>
    </Link>
  );
}
