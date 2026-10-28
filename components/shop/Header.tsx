import Link from "next/link";
import { HelpCircle, Megaphone, Package, Phone, Truck } from "lucide-react";
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

// Menu data rarely changes: cache it across requests, refreshed whenever the catalog is edited.
const getMenuData = unstable_cache(
  async (autoHide: boolean) => {
    const visible = visibleWhere({ autoHideOutOfStock: autoHide });
    const [categories, saleCount] = await Promise.all([
      db.category.findMany({ include: { _count: { select: { products: { where: visible } } } }, orderBy: { name: "asc" } }),
      db.product.count({ where: { ...visible, comparePrice: { not: null } } }),
    ]);
    return {
      // Hide empty categories from the menus.
      cats: categories.filter((c) => c._count.products > 0).map((c) => ({ name: c.name, slug: c.slug, image: c.image, count: c._count.products })),
      saleCount,
    };
  },
  ["menu-data"],
  { tags: [CATALOG_TAG], revalidate: 300 }
);

export async function Header() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const { cats, saleCount } = await getMenuData(settings.autoHideOutOfStock);
  const freeShip = settings.freeShippingThreshold > 0 ? formatPrice(settings.freeShippingThreshold, settings.currency).replace(/\.00$/, "") : null;
  const headerUser = user ? { name: user.name, role: user.role } : null;

  return (
    <>
      {/* Utility bar (brand yellow) */}
      <div className="bg-brand-400 text-slate-900">
        <div className="container-x flex h-9 items-center justify-between gap-4 text-xs font-medium">
          <p className="flex min-w-0 items-center gap-2">
            <Megaphone className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{settings.announcement || settings.tagline}</span>
          </p>
          <div className="hidden shrink-0 items-center gap-5 md:flex">
            <a href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1.5 hover:underline">
              <Phone className="h-3.5 w-3.5" /> {settings.contactPhone}
            </a>
            <Link href="/account/orders" className="flex items-center gap-1.5 hover:underline">
              <Package className="h-3.5 w-3.5" /> Track order
            </Link>
            <Link href="/contact" className="flex items-center gap-1.5 hover:underline">
              <HelpCircle className="h-3.5 w-3.5" /> Help
            </Link>
          </div>
        </div>
      </div>

      <StickyShell>
        {/* Main bar */}
        <div className="container-x flex h-16 items-center gap-2 sm:h-[76px] sm:gap-6">
          <MobileMenu nav={NAV} categories={cats} user={headerUser} storeName={settings.storeName} phone={settings.contactPhone} hasDeals={saleCount > 0} />
          <Link href="/" className="flex shrink-0 items-center" aria-label={`${settings.storeName} — home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.webp" alt={settings.storeName} width={700} height={138} className="h-8 w-auto sm:h-10 lg:h-11" />
          </Link>
          <div className="hidden flex-1 justify-center md:flex">
            <SearchBar />
          </div>
          <div className="ml-auto md:ml-0">
            <HeaderActions user={headerUser} />
          </div>
        </div>

        {/* Mobile search */}
        <div className="container-x pb-3 md:hidden">
          <SearchBar compact />
        </div>

        {/* Category / nav bar */}
        <div className="hidden border-t border-white/10 lg:block">
          <div className="container-x flex h-12 items-center gap-8">
            <CategoryMenu categories={cats} />
            <NavLinks nav={NAV} />
            <div className="ml-auto flex items-center gap-5 text-sm">
              {freeShip && (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Truck className="h-4 w-4 text-brand-400" /> Free delivery over <strong className="text-white">{freeShip}</strong>
                </span>
              )}
              {saleCount > 0 && (
                <Link
                  href="/products?sale=1&sort=discount"
                  className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-bold tracking-wide text-red-300 uppercase ring-1 ring-red-500/30 transition hover:bg-red-500/25"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                  Hot deals
                </Link>
              )}
            </div>
          </div>
        </div>
      </StickyShell>
    </>
  );
}
