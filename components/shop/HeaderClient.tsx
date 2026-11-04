"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Heart,
  Home,
  LayoutDashboard,
  LayoutGrid,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  Phone,
  Search,
  ShoppingCart,
  Store,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { useWishlist } from "@/components/providers/WishlistProvider";
import { usePrice } from "@/components/providers/StoreProvider";
import { SafeImage } from "@/components/ui/SafeImage";
import { logout } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { telHref, whatsappHref } from "@/lib/store";

type NavItem = { href: string; label: string };
type NavLink = { href: string; label: string; hot?: boolean; wide?: boolean };
type Cat = { name: string; slug: string; image: string | null; count: number };
type SearchCat = { name: string; slug: string };
type HeaderUser = { name: string; role: string } | null;

function useClickOutside<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onOutside]);
  return ref;
}

/* ---------------- Sticky wrapper (white) ---------------- */

export function StickyShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-slate-200 bg-white text-slate-900 transition-shadow duration-300",
        scrolled && "shadow-[0_6px_20px_-10px_rgba(15,23,42,0.25)]"
      )}
    >
      {children}
    </header>
  );
}

/* ---------------- Nav shortcuts with active underline ---------------- */

function NavLinksInner({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const isActive = (href: string) => {
    const [path, qs] = href.split("?");
    if (pathname !== path || !qs) return false;
    return [...new URLSearchParams(qs).entries()].every(([k, v]) => params.get(k) === v);
  };
  return (
    <nav className="flex min-w-0 items-stretch gap-6 overflow-hidden" aria-label="Main">
      {links.map((n) => {
        const active = isActive(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative shrink-0 items-center text-[15px] font-semibold whitespace-nowrap transition-colors",
              n.wide ? "hidden xl:flex" : "flex",
              n.hot ? "text-red-600 hover:text-red-700" : active ? "text-slate-950" : "text-slate-700 hover:text-slate-950",
              "after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:origin-left after:rounded-t after:bg-brand-400 after:transition-transform after:duration-200",
              active ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100"
            )}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function NavLinks({ links }: { links: NavLink[] }) {
  return (
    <Suspense fallback={<nav className="flex items-center gap-6 text-[15px] font-semibold text-slate-700">{links.filter((l) => !l.wide).map((n) => <span key={n.href}>{n.label}</span>)}</nav>}>
      <NavLinksInner links={links} />
    </Suspense>
  );
}

/* ---------------- "All Categories" dropdown ---------------- */

export function CategoryMenu({ categories }: { categories: Cat[] }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  const show = () => {
    clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div ref={ref} className="relative shrink-0" onMouseEnter={show} onMouseLeave={hide}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex h-full items-center gap-2.5 bg-brand-400 px-5 text-[15px] font-bold text-slate-950 transition hover:bg-brand-300"
      >
        <Menu className="h-[18px] w-[18px]" strokeWidth={2.5} />
        All Categories
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && categories.length > 0 && (
        <div className="animate-in absolute top-full left-0 z-50 w-[300px] border border-t-0 border-slate-200 bg-white shadow-[0_18px_40px_-12px_rgba(15,23,42,0.25)]">
          <ul className="max-h-[70vh] overflow-y-auto py-2">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/products?category=${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-3 px-5 py-2.5 text-[15px] text-slate-800 transition hover:bg-brand-50 hover:text-slate-950"
                >
                  <span className="truncate">{c.name}</span>
                  <span className="text-xs text-slate-400">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/categories"
            onClick={() => setOpen(false)}
            className="flex items-center gap-1.5 border-t border-slate-100 px-5 py-3 text-sm font-bold text-slate-900 hover:bg-brand-50"
          >
            All categories <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

/* ---------------- Search (category select + live suggestions) ---------------- */

type Suggestion = { name: string; slug: string; price: number; comparePrice: number | null; image: string; category: string | null };

export function SearchBar({ compact, categories = [] }: { compact?: boolean; categories?: SearchCat[] }) {
  const router = useRouter();
  const fmt = usePrice();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [cats, setCats] = useState<{ name: string; slug: string }[]>([]);
  const [active, setActive] = useState(-1);
  const ref = useClickOutside<HTMLFormElement>(() => setOpen(false));

  useEffect(() => {
    setActive(-1);
    if (q.trim().length < 2) {
      setItems([]);
      setCats([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        const data = await res.json();
        setItems(data.products ?? []);
        setCats(data.categories ?? []);
        setOpen(true);
      } catch {}
      setLoading(false);
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const goAll = () => {
    setOpen(false);
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (cat) sp.set("category", cat);
    const qs = sp.toString();
    router.push(`/products${qs ? `?${qs}` : ""}`);
  };

  return (
    <form
      ref={ref}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (active >= 0 && items[active]) {
          setOpen(false);
          router.push(`/products/${items[active].slug}`);
        } else goAll();
      }}
      className={cn("relative w-full", !compact && "max-w-3xl")}
    >
      <div className="flex h-11 items-stretch overflow-hidden rounded-xl border-2 border-slate-900 bg-white transition focus-within:border-brand-500 focus-within:shadow-[0_0_0_4px_rgba(245,211,58,0.35)] sm:h-12">
        {!compact && categories.length > 0 && (
          <div className="relative hidden shrink-0 border-r border-slate-200 bg-slate-50 lg:block">
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              aria-label="Search in category"
              className="h-full max-w-[170px] cursor-pointer appearance-none bg-transparent pr-8 pl-4 text-sm font-semibold text-slate-800 focus:outline-none"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>
        )}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q.trim().length >= 2 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(items.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(-1, i - 1));
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search tools, brands and models"
          className="min-w-0 flex-1 bg-transparent px-4 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
          aria-label="Search products"
          autoComplete="off"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} className="px-2 text-slate-400 hover:text-slate-600" aria-label="Clear search">
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          className={cn(
            "flex shrink-0 items-center justify-center gap-2 bg-brand-400 font-bold text-slate-950 transition hover:bg-brand-300",
            compact ? "w-12" : "px-4 text-[15px] sm:px-6"
          )}
          aria-label="Search"
        >
          {loading ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Search className="h-[18px] w-[18px]" strokeWidth={2.5} />}
          {!compact && <span className="hidden sm:inline">Search</span>}
        </button>
      </div>

      {open && q.trim().length >= 2 && (
        <div className="animate-in absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl shadow-slate-900/20">
          {cats.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 p-3">
              <span className="mr-1 text-xs font-medium text-slate-400">Categories:</span>
              {cats.map((c) => (
                <Link
                  key={c.slug}
                  href={`/products?category=${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 hover:bg-brand-100"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
          {items.length ? (
            <ul className="max-h-96 overflow-y-auto p-1.5">
              {items.map((p, i) => (
                <li key={p.slug}>
                  <Link
                    href={`/products/${p.slug}`}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActive(i)}
                    className={cn("flex items-center gap-3 rounded-xl px-2.5 py-2", i === active && "bg-slate-50")}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-50 p-1">
                      <SafeImage src={p.image} alt="" className="h-full w-full object-contain mix-blend-multiply" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      {p.category && <span className="text-xs text-slate-400">{p.category}</span>}
                    </span>
                    <span className="text-right text-sm font-semibold">
                      {fmt(p.price)}
                      {p.comparePrice && <span className="block text-xs font-normal text-slate-400 line-through">{fmt(p.comparePrice)}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            !loading && <p className="px-4 py-8 text-center text-sm text-slate-500">No products found for &ldquo;{q}&rdquo;</p>
          )}
          <button type="submit" className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
            See all results for &ldquo;{q}&rdquo; <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </form>
  );
}

/* ---------------- Account / wishlist / cart ---------------- */

function CountBadge({ n, always }: { n: number; always?: boolean }) {
  if (!n && !always) return null;
  return (
    <span className="absolute -top-2 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-400 px-1 text-[10px] font-extrabold text-slate-950 ring-2 ring-white">
      {n > 99 ? "99+" : n}
    </span>
  );
}

function ActionItem({ href, icon: Icon, count, alwaysCount, top, bottom, label }: { href: string; icon: typeof Heart; count?: number; alwaysCount?: boolean; top: string; bottom: string; label: string }) {
  return (
    <Link href={href} aria-label={label} className="group flex items-center gap-4 rounded-xl px-2 py-1.5 transition hover:bg-slate-100">
      <span className="relative text-slate-800">
        <Icon className="h-6 w-6" strokeWidth={1.9} />
        <CountBadge n={count ?? 0} always={alwaysCount} />
      </span>
      <span className="hidden text-left leading-tight xl:block">
        <span className="block text-[11px] text-slate-500">{top}</span>
        <span className="block text-sm font-bold text-slate-900">{bottom}</span>
      </span>
    </Link>
  );
}

export function HeaderActions({ user }: { user: HeaderUser }) {
  const { count, subtotal, ready } = useCart();
  const wishlist = useWishlist();
  const fmt = usePrice();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const isStaff = user?.role === "ADMIN" || user?.role === "STAFF";

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {/* Account (phones use the bottom bar instead) */}
      <div className="relative hidden md:block" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Account menu"
          className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-slate-100"
        >
          {user ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-400 text-xs font-extrabold text-slate-950">{user.name.charAt(0).toUpperCase()}</span>
          ) : (
            <User className="h-6 w-6 text-slate-800" strokeWidth={1.9} />
          )}
          <span className="hidden text-left leading-tight xl:block">
            <span className="block text-[11px] text-slate-500">{user ? `Hello, ${user.name.split(" ")[0]}` : "Hello, sign in"}</span>
            <span className="flex items-center gap-0.5 text-sm font-bold text-slate-900">
              Account <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
            </span>
          </span>
        </button>
        {open && (
          <div className="animate-in absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl shadow-slate-900/20">
            {user ? (
              <>
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-400 font-extrabold text-slate-950">{user.name.charAt(0).toUpperCase()}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.role === "ADMIN" ? "Super admin" : user.role === "STAFF" ? "Staff" : "Customer"}</p>
                  </div>
                </div>
                <div className="p-1.5">
                  {isStaff && <MenuLink href="/admin" icon={LayoutDashboard} onClick={() => setOpen(false)} highlight>Admin dashboard</MenuLink>}
                  <MenuLink href="/account" icon={User} onClick={() => setOpen(false)}>My account</MenuLink>
                  <MenuLink href="/account/orders" icon={Package} onClick={() => setOpen(false)}>My orders</MenuLink>
                  <MenuLink href="/wishlist" icon={Heart} onClick={() => setOpen(false)}>Wishlist</MenuLink>
                </div>
                <form action={logout} className="border-t border-slate-100 p-1.5">
                  <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </form>
              </>
            ) : (
              <div className="p-4">
                <p className="font-semibold">Welcome to our store</p>
                <p className="mt-1 text-xs text-slate-500">Sign in to track orders, save your wishlist and check out faster.</p>
                <Link href="/login" onClick={() => setOpen(false)} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-bold text-white hover:bg-black">
                  <LogIn className="h-4 w-4" /> Sign in
                </Link>
                <Link href="/register" onClick={() => setOpen(false)} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 hover:border-slate-400">
                  <UserPlus className="h-4 w-4" /> Create account
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="hidden md:block">
        <ActionItem href="/wishlist" icon={Heart} count={wishlist.items.length} label="Wishlist" top="Saved" bottom="Wishlist" />
      </div>
      <ActionItem href="/cart" icon={ShoppingCart} count={count} alwaysCount label="Cart" top={ready ? fmt(subtotal) : "Rs. 0"} bottom="Cart" />
    </div>
  );
}

function MenuLink({ href, icon: Icon, children, onClick, highlight }: { href: string; icon: typeof User; children: React.ReactNode; onClick: () => void; highlight?: boolean }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition", highlight ? "font-semibold text-brand-800 hover:bg-brand-50" : "text-slate-700 hover:bg-slate-50")}
    >
      <Icon className="h-4 w-4" /> {children}
    </Link>
  );
}

/* ---------------- Mobile drawer ---------------- */

const OPEN_MENU_EVENT = "open-mobile-menu";

export function MobileMenu({
  nav,
  categories,
  user,
  storeName,
  phones,
  hasDeals,
}: {
  nav: NavItem[];
  categories: Cat[];
  user: HeaderUser;
  storeName: string;
  phones: string[];
  hasDeals?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const openMenu = () => setOpen(true);
    window.addEventListener(OPEN_MENU_EVENT, openMenu);
    return () => window.removeEventListener(OPEN_MENU_EVENT, openMenu);
  }, []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isStaff = user?.role === "ADMIN" || user?.role === "STAFF";
  const close = () => setOpen(false);
  const sectionTitle = "px-5 pt-5 pb-2 text-xs font-bold tracking-[0.12em] text-slate-500 uppercase";
  const row = "flex items-center justify-between gap-3 px-5 py-3 text-[16px] text-slate-900 active:bg-slate-50";

  // Rendered through a portal into <body> so the fixed drawer is sized to the screen, not the header.
  const drawer = (
    <div className={cn("fixed inset-0 z-[60] lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")} role="dialog" aria-modal="true" aria-label="Menu" aria-hidden={!open}>
      <div className={cn("absolute inset-0 bg-slate-950/50 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")} onClick={close} />
      <div
        className={cn(
          "absolute inset-y-0 left-0 flex w-[86%] max-w-[340px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-slate-200 px-5">
          <Link href="/" onClick={close} className="flex items-center gap-2" aria-label={`${storeName} — home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/emblem.png" alt="" width={96} height={96} className="h-9 w-9" />
            <span className="text-[21px] font-extrabold tracking-tight">toolsonline</span>
          </Link>
          <button ref={closeRef} onClick={close} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-900 hover:bg-slate-200" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain pb-4">
          {categories.length > 0 && (
            <>
              <p className={sectionTitle}>Shop by category</p>
              <ul>
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/products?category=${c.slug}`} onClick={close} className={row}>
                      <span className="truncate">{c.name}</span>
                      <span className="text-xs text-slate-400">{c.count}</span>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/categories" onClick={close} className={cn(row, "justify-start gap-1.5 font-bold")}>
                    All categories <ArrowRight className="h-4 w-4" />
                  </Link>
                </li>
              </ul>
            </>
          )}

          <p className={sectionTitle}>Shop</p>
          <ul>
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} onClick={close} className={row}>
                  {n.label}
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </Link>
              </li>
            ))}
            {hasDeals && (
              <li>
                <Link href="/products?sale=1&sort=discount" onClick={close} className={cn(row, "font-semibold text-red-600")}>
                  Hot deals <ChevronRight className="h-4 w-4" />
                </Link>
              </li>
            )}
          </ul>

          <p className={sectionTitle}>Account</p>
          {user ? (
            <ul>
              {[
                ...(isStaff ? [{ href: "/admin", label: "Admin dashboard", icon: LayoutDashboard }] : []),
                { href: "/account", label: `My account (${user.name.split(" ")[0]})`, icon: User },
                { href: "/account/orders", label: "My orders", icon: Package },
                { href: "/wishlist", label: "Wishlist", icon: Heart },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} onClick={close} className={cn(row, "justify-start")}>
                    <l.icon className="h-[18px] w-[18px] text-slate-400" /> {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <form action={logout}>
                  <button className={cn(row, "w-full justify-start text-red-600")}>
                    <LogOut className="h-[18px] w-[18px]" /> Sign out
                  </button>
                </form>
              </li>
            </ul>
          ) : (
            <div className="grid grid-cols-2 gap-2 px-5">
              <Link href="/login" onClick={close} className="flex h-11 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">Sign in</Link>
              <Link href="/register" onClick={close} className="flex h-11 items-center justify-center rounded-xl border border-slate-300 text-sm font-bold">Register</Link>
            </div>
          )}

          <p className={sectionTitle}>Need help?</p>
          <div className="space-y-2 px-5">
            {phones.map((p) => (
              <a key={p} href={telHref(p)} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-[15px] font-semibold active:bg-slate-100">
                <Phone className="h-4 w-4 text-brand-600" /> {p}
              </a>
            ))}
            <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-[15px] font-bold text-white">
              <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-900 transition hover:bg-slate-100 active:scale-95 lg:hidden"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="h-6 w-6" strokeWidth={2.2} />
      </button>
      {mounted && createPortal(drawer, document.body)}
    </>
  );
}

/* ---------------- Mobile bottom navigation ---------------- */

export function MobileBottomNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const { count } = useCart();

  const items: { key: string; label: string; icon: typeof Home; href?: string; active: boolean; count?: number }[] = [
    { key: "home", label: "Home", icon: Home, href: "/", active: pathname === "/" },
    { key: "shop", label: "Shop", icon: Store, href: "/products", active: pathname.startsWith("/products") },
    { key: "menu", label: "Categories", icon: LayoutGrid, active: false },
    { key: "cart", label: "Cart", icon: ShoppingCart, href: "/cart", active: pathname === "/cart" || pathname === "/checkout", count },
    {
      key: "account",
      label: signedIn ? "Account" : "Sign in",
      icon: User,
      href: signedIn ? "/account" : "/login",
      active: pathname.startsWith("/account") || pathname === "/login" || pathname === "/register",
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-8px_rgba(15,23,42,0.12)] lg:hidden print:hidden"
      aria-label="Bottom navigation"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {items.map((i) => {
          const content = (
            <>
              {i.active && <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-brand-600" />}
              <span className="relative">
                <i.icon className={cn("h-[22px] w-[22px] transition", i.active ? "text-brand-600" : "text-slate-500")} strokeWidth={i.active ? 2.2 : 1.8} />
                {!!i.count && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                    {i.count > 99 ? "99+" : i.count}
                  </span>
                )}
              </span>
              <span className={cn("text-[10px] font-medium", i.active ? "text-brand-700" : "text-slate-500")}>{i.label}</span>
            </>
          );
          const cls = "relative flex h-full w-full flex-col items-center justify-center gap-1 transition active:bg-slate-50";
          return (
            <li key={i.key}>
              {i.href ? (
                <Link href={i.href} className={cls} aria-current={i.active ? "page" : undefined}>{content}</Link>
              ) : (
                <button type="button" className={cls} onClick={() => window.dispatchEvent(new Event(OPEN_MENU_EVENT))}>{content}</button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
