import Link from "next/link";
import { Phone } from "lucide-react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CATALOG_TAG, getSettings } from "@/lib/settings";
import { visibleWhere } from "@/lib/products";
import { formatPrice } from "@/lib/utils";
import { NAV_CATEGORIES, STORE, telHref } from "@/lib/store";
import { CategoryMenu, HeaderActions, MobileMenu, NavLinks, SearchBar, StickyShell } from "./HeaderClient";

/** Extra pages (shown in the mobile drawer; the desktop bar uses category/brand shortcuts). */
export const NAV = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Shop all" },
  { href: "/products?sort=newest", label: "New arrivals" },
  { href: "/products?featured=1", label: "Bestsellers" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

// Menu data rarely changes: cache it across requests, refreshed whenever the catalog is edited.
const getMenuData = unstable_cache(
  async (autoHide: boolean) => {
    const visible = visibleWhere({ autoHideOutOfStock: autoHide });
    const [categories, brands, saleCount] = await Promise.all([
      db.category.findMany({ include: { _count: { select: { products: { where: visible } } } }, orderBy: { name: "asc" } }),
      db.brand.findMany({ include: { _count: { select: { products: { where: visible } } } }, orderBy: { name: "asc" } }),
      db.product.count({ where: { ...visible, comparePrice: { not: null } } }),
    ]);
    return {
      // Hide empty categories/brands; biggest categories first.
      cats: categories
        .filter((c) => c._count.products > 0)
        .sort((a, b) => b._count.products - a._count.products)
        .map((c) => ({ name: c.name, slug: c.slug, image: c.image, count: c._count.products })),
      brands: brands.filter((b) => b._count.products > 0).map((b) => ({ name: b.name, slug: b.slug })),
      saleCount,
    };
  },
  ["menu-data-v2"],
  { tags: [CATALOG_TAG], revalidate: 300 }
);

/** Yellow emblem + dark wordmark: readable on the white header (the full logo has white text). */
function Logo({ storeName }: { storeName: string }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-2.5" aria-label={`${storeName} — home`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/emblem.png" alt="" width={96} height={96} className="h-9 w-9 shrink-0 sm:h-11 sm:w-11" />
      <span className="leading-none">
        <span className="block text-[21px] font-extrabold tracking-tight text-slate-900 sm:text-[25px]">toolsonline</span>
        <span className="mt-1 hidden text-[9px] font-semibold tracking-[0.18em] text-slate-500 uppercase sm:block">Your hardware partner</span>
      </span>
    </Link>
  );
}

export async function Header() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const { cats, brands, saleCount } = await getMenuData(settings.autoHideOutOfStock);
  const freeShip = settings.freeShippingThreshold > 0 ? formatPrice(settings.freeShippingThreshold, settings.currency).replace(/\.00$/, "") : null;
  const headerUser = user ? { name: user.name, role: user.role } : null;
  const navCats = NAV_CATEGORIES.map((n) => ({ ...n, cat: cats.find((c) => c.slug === n.slug) })).filter((n) => n.cat);
  const searchCats = cats.map((c) => ({ name: c.name, slug: c.slug }));

  return (
    <>
      {/* Top bar (dark) */}
      <div className="bg-slate-950 text-slate-300">
        <div className="container-x flex h-9 items-center justify-center gap-6 text-[13px] md:justify-between">
          <p className="hidden min-w-0 truncate md:block">
            {freeShip ? (
              <>
                Free delivery on orders over <strong className="font-bold text-brand-400">{freeShip}</strong> · Cash on delivery available
              </>
            ) : (
              settings.announcement || "Cash on delivery available"
            )}
          </p>
          <nav className="flex shrink-0 items-center gap-5 sm:gap-6" aria-label="Help">
            <Link href="/account/orders" className="transition hover:text-white">Track order</Link>
            <Link href="/contact" className="transition hover:text-white">Help</Link>
            {STORE.phones.map((p, i) => (
              <a key={p} href={telHref(p)} className={`transition hover:text-white ${i > 0 ? "hidden lg:inline" : ""}`}>
                {p}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <StickyShell>
        {/* Main bar (white) */}
        <div className="container-x flex h-16 items-center gap-3 sm:h-[76px] lg:gap-8">
          <MobileMenu nav={NAV} categories={cats} user={headerUser} storeName={settings.storeName} phones={STORE.phones} hasDeals={saleCount > 0} />
          <Logo storeName={settings.storeName} />
          <div className="hidden flex-1 md:block">
            <SearchBar categories={searchCats} />
          </div>
          <div className="ml-auto md:ml-0">
            <HeaderActions user={headerUser} />
          </div>
        </div>

        {/* Mobile search */}
        <div className="container-x pb-3 md:hidden">
          <SearchBar compact categories={searchCats} />
        </div>

        {/* Nav row: All Categories + shortcuts */}
        <div className="hidden border-t border-slate-200 lg:block">
          <div className="container-x flex h-12 items-stretch gap-6">
            <CategoryMenu categories={cats} />
            <NavLinks
              links={[
                { href: "/products?featured=1", label: "Bestsellers", hot: true },
                ...(saleCount > 0 ? [{ href: "/products?sale=1&sort=discount", label: "Deals", hot: true }] : []),
                ...navCats.map((n) => ({ href: `/products?category=${n.slug}`, label: n.label })),
                ...brands.map((b) => ({ href: `/products?brand=${b.slug}`, label: b.name, wide: true })),
              ]}
            />
            <Link href="/contact" className="ml-auto hidden shrink-0 items-center gap-2 text-sm font-bold text-slate-900 transition hover:text-brand-700 xl:flex">
              <Phone className="h-4 w-4 text-brand-600" /> Need help choosing?
            </Link>
          </div>
        </div>
      </StickyShell>
    </>
  );
}
