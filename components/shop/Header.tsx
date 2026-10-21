import Link from "next/link";
import { HelpCircle, Megaphone, Package, Phone, ShoppingBag, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unstable_cache } from "next/cache";
import { CATALOG_TAG, getSettings } from "@/lib/settings";
import { visibleWhere } from "@/lib/products";
import { formatPrice } from "@/lib/utils";
import { CategoryMenu, HeaderActions, MobileMenu, NavLinks, SearchBar, StickyShell } from "./HeaderClient";

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Shop" },
  { href: "/products?sort=newest", label: "New Arrivals" },
  { href: "/products?featured=1", label: "Bestsellers" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

// Category menu data rarely changes: cache it across requests, refreshed whenever the catalog is edited.
const getMenuCategories = unstable_cache(
  async (autoHide: boolean) => {
    const categories = await db.category.findMany({
      include: { _count: { select: { products: { where: visibleWhere({ autoHideOutOfStock: autoHide }) } } } },
      orderBy: { name: "asc" },
    });
    return categories.map((c) => ({ name: c.name, slug: c.slug, image: c.image, count: c._count.products }));
  },
  ["menu-categories"],
  { tags: [CATALOG_TAG] }
);

export async function Header() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const cats = await getMenuCategories(settings.autoHideOutOfStock);
  const freeShip = settings.freeShippingThreshold > 0 ? formatPrice(settings.freeShippingThreshold, settings.currency).replace(/\.00$/, "") : null;

  const logo = (
    <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label={`${settings.storeName} home`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-600/25 transition group-hover:scale-105 sm:h-10 sm:w-10">
        <ShoppingBag className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span className="block max-w-[9rem] truncate text-base font-extrabold tracking-tight text-slate-900 sm:max-w-none sm:text-lg">{settings.storeName}</span>
        <span className="hidden text-[11px] font-medium text-slate-400 sm:block">Shop smarter, live better</span>
      </span>
    </Link>
  );

  return (
    <>
      {/* Utility bar */}
      <div className="bg-slate-950 text-slate-300">
        <div className="container-x flex h-9 items-center justify-between gap-4 text-xs">
          <p className="flex min-w-0 items-center gap-2">
            <Megaphone className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            <span className="truncate">{settings.announcement || settings.tagline}</span>
          </p>
          <div className="hidden shrink-0 items-center gap-5 md:flex">
            <a href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1.5 transition hover:text-white">
              <Phone className="h-3.5 w-3.5" /> {settings.contactPhone}
            </a>
            <Link href="/account/orders" className="flex items-center gap-1.5 transition hover:text-white">
              <Package className="h-3.5 w-3.5" /> Track order
            </Link>
            <Link href="/contact" className="flex items-center gap-1.5 transition hover:text-white">
              <HelpCircle className="h-3.5 w-3.5" /> Help
            </Link>
          </div>
        </div>
      </div>

      <StickyShell>
        {/* Main bar */}
        <div className="container-x flex h-16 items-center gap-2 sm:h-[72px] sm:gap-6">
          <MobileMenu nav={NAV} categories={cats} user={user ? { name: user.name, role: user.role } : null} storeName={settings.storeName} phone={settings.contactPhone} />
          {logo}
          <div className="hidden flex-1 justify-center md:flex">
            <SearchBar />
          </div>
          <div className="ml-auto md:ml-0">
            <HeaderActions user={user ? { name: user.name, role: user.role } : null} />
          </div>
        </div>

        {/* Mobile search */}
        <div className="container-x pb-3 md:hidden">
          <SearchBar compact />
        </div>

        {/* Category / nav bar */}
        <div className="hidden border-t border-slate-100 lg:block">
          <div className="container-x flex h-12 items-center gap-8">
            <CategoryMenu categories={cats} />
            <NavLinks nav={NAV} />
            <div className="ml-auto flex items-center gap-5 text-sm">
              {freeShip && (
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Truck className="h-4 w-4 text-emerald-600" /> Free shipping over <strong className="text-slate-900">{freeShip}</strong>
                </span>
              )}
              <Link
                href="/products?sale=1&sort=discount"
                className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold tracking-wide text-red-600 uppercase ring-1 ring-red-100 transition hover:bg-red-100"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                Hot deals
              </Link>
            </div>
          </div>
        </div>
      </StickyShell>
    </>
  );
}
