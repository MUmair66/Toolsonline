"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Home,
  Store,
  Heart,
  LayoutDashboard,
  LayoutGrid,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Package,
  Phone,
  Search,
  ShoppingBag,
  ShoppingCart,
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

type NavItem = { href: string; label: string };
type Cat = { name: string; slug: string; image: string | null; count: number };
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

/* ---------------- Sticky wrapper ---------------- */

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
        "sticky top-0 z-40 border-b bg-white/95 backdrop-blur-md transition-shadow duration-300",
        scrolled ? "border-slate-200 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.15)]" : "border-slate-200/70"
      )}
    >
      {children}
    </header>
  );
}

/* ---------------- Nav links with active indicator ---------------- */

function NavLinksInner({ nav }: { nav: NavItem[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const isActive = (href: string) => {
    const [path, qs] = href.split("?");
    if (path === "/") return pathname === "/";
    if (pathname !== path) return false;
    if (!qs) return !params.get("sort") && !params.get("featured") && !params.get("sale");
    return [...new URLSearchParams(qs).entries()].every(([k, v]) => params.get(k) === v);
  };
  return (
    <nav className="flex h-full items-center gap-7" aria-label="Main">
      {nav.map((n) => {
        const active = isActive(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-full items-center text-sm font-medium transition-colors",
              active ? "text-slate-900" : "text-slate-500 hover:text-slate-900",
              "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:rounded-full after:bg-brand-600 after:transition-transform after:duration-300",
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

export function NavLinks({ nav }: { nav: NavItem[] }) {
  return (
    <Suspense fallback={<nav className="flex gap-7 text-sm text-slate-500">{nav.map((n) => <span key={n.href}>{n.label}</span>)}</nav>}>
      <NavLinksInner nav={nav} />
    </Suspense>
  );
}

/* ---------------- Category mega menu ---------------- */

export function CategoryMenu({ categories }: { categories: Cat[] }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(0);
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
  const preview = categories[hover];

  return (
    <div ref={ref} className="relative h-full" onMouseEnter={show} onMouseLeave={hide}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "flex h-full items-center gap-2 pr-1 text-sm font-semibold transition-colors",
          open ? "text-brand-700" : "text-slate-900 hover:text-brand-700"
        )}
      >
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg transition", open ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700")}>
          <LayoutGrid className="h-4 w-4" />
        </span>
        All categories
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && categories.length > 0 && (
        <div className="animate-in absolute top-full left-0 z-50 pt-2">
          <div className="flex w-[680px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
            <ul className="w-64 shrink-0 border-r border-slate-100 p-2">
              {categories.map((c, i) => (
                <li key={c.slug}>
                  <Link
                    href={`/products?category=${c.slug}`}
                    onMouseEnter={() => setHover(i)}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                      hover === i ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <SafeImage src={c.image} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                    <span className="flex-1 font-medium">{c.name}</span>
                    <span className="text-xs text-slate-400">{c.count}</span>
                    <ChevronRight className={cn("h-4 w-4 transition", hover === i ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0")} />
                  </Link>
                </li>
              ))}
              <li className="mt-1 border-t border-slate-100 pt-1">
                <Link href="/categories" onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-brand-600 hover:bg-brand-50">
                  Browse all categories <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
            </ul>
            {preview && (
              <Link
                href={`/products?category=${preview.slug}`}
                onClick={() => setOpen(false)}
                className="group relative flex-1 overflow-hidden"
              >
                <SafeImage src={preview.image} alt={preview.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                <div className="absolute inset-x-6 bottom-6 text-white">
                  <p className="text-xs font-semibold tracking-widest text-white/70 uppercase">{preview.count} products</p>
                  <p className="mt-1 text-2xl font-bold">{preview.name}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition group-hover:gap-2.5">
                    Shop {preview.name} <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Search with live suggestions ---------------- */

type Suggestion = { name: string; slug: string; price: number; comparePrice: number | null; image: string; category: string | null };

export function SearchBar({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const fmt = usePrice();
  const [q, setQ] = useState("");
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
    router.push(`/products${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
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
      className={cn("relative w-full", !compact && "max-w-2xl")}
    >
      <div className="group flex items-center rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-brand-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(99,102,241,0.12)] hover:border-slate-300">
        <span className="pl-4 text-slate-400">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </span>
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
          placeholder="Search for products, brands and categories…"
          className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm placeholder:text-slate-400 focus:outline-none"
          aria-label="Search products"
          autoComplete="off"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} className="p-1 text-slate-400 hover:text-slate-600" aria-label="Clear search">
            <X className="h-4 w-4" />
          </button>
        )}
        <button type="submit" className="m-1 hidden rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 sm:block">
          Search
        </button>
      </div>

      {open && q.trim().length >= 2 && (
        <div className="animate-in absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
          {cats.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 p-3">
              <span className="mr-1 text-xs font-medium text-slate-400">Categories:</span>
              {cats.map((c) => (
                <Link
                  key={c.slug}
                  href={`/products?category=${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
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
                    <SafeImage src={p.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
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
          <button type="submit" className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-brand-600 hover:bg-slate-100">
            See all results for &ldquo;{q}&rdquo; <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </form>
  );
}

/* ---------------- Account / wishlist / cart ---------------- */

function CountBadge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
      {n > 99 ? "99+" : n}
    </span>
  );
}

function ActionItem({
  href,
  icon: Icon,
  count,
  top,
  bottom,
  label,
}: {
  href: string;
  icon: typeof Heart;
  count?: number;
  top?: string;
  bottom?: string;
  label: string;
}) {
  return (
    <Link href={href} aria-label={label} className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-slate-100 xl:px-3">
      <span className="relative text-slate-700 transition group-hover:text-brand-600">
        <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} />
        <CountBadge n={count ?? 0} />
      </span>
      {(top || bottom) && (
        <span className="hidden text-left leading-tight xl:block">
          <span className="block text-[11px] text-slate-400">{top}</span>
          <span className="block text-sm font-semibold text-slate-900">{bottom}</span>
        </span>
      )}
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
    <div className="flex items-center gap-0.5 sm:gap-1">
      {/* Account */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Account menu"
          className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-slate-100 xl:px-3"
        >
          {user ? (
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
          ) : (
            <User className="h-[22px] w-[22px] text-slate-700 group-hover:text-brand-600" strokeWidth={1.75} />
          )}
          <span className="hidden text-left leading-tight xl:block">
            <span className="block text-[11px] text-slate-400">{user ? `Hello, ${user.name.split(" ")[0]}` : "Welcome"}</span>
            <span className="flex items-center gap-0.5 text-sm font-semibold text-slate-900">
              {user ? "My account" : "Sign in"} <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
            </span>
          </span>
        </button>
        {open && (
          <div className="animate-in absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
            {user ? (
              <>
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
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
                <Link href="/login" onClick={() => setOpen(false)} className="btn-primary mt-4 w-full">
                  <LogIn className="h-4 w-4" /> Sign in
                </Link>
                <Link href="/register" onClick={() => setOpen(false)} className="btn-secondary mt-2 w-full">
                  <UserPlus className="h-4 w-4" /> Create account
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="hidden sm:block">
        <ActionItem href="/wishlist" icon={Heart} count={wishlist.items.length} label="Wishlist" top="Saved" bottom="Wishlist" />
      </div>
      <ActionItem href="/cart" icon={ShoppingCart} count={count} label="Cart" top={`${count} item${count === 1 ? "" : "s"}`} bottom={ready ? fmt(subtotal) : "Cart"} />
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
  onClick,
  highlight,
}: {
  href: string;
  icon: typeof User;
  children: React.ReactNode;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
        highlight ? "font-semibold text-brand-700 hover:bg-brand-50" : "text-slate-700 hover:bg-slate-50"
      )}
    >
      <Icon className="h-4 w-4" /> {children}
    </Link>
  );
}

/* ---------------- Mobile drawer ---------------- */

const OPEN_MENU_EVENT = "open-mobile-menu";

/** Animated hamburger / close icon. */
function Burger({ open }: { open: boolean }) {
  const bar = "absolute left-0 h-0.5 w-full rounded-full bg-current transition-all duration-300 ease-out";
  return (
    <span className="relative block h-4 w-5" aria-hidden>
      <span className={cn(bar, open ? "top-[7px] rotate-45" : "top-0")} />
      <span className={cn(bar, "top-[7px]", open ? "scale-x-0 opacity-0" : "opacity-100")} />
      <span className={cn(bar, open ? "top-[7px] -rotate-45" : "top-[14px]")} />
    </span>
  );
}

export function MobileMenu({
  nav,
  categories,
  user,
  storeName,
  phone,
}: {
  nav: NavItem[];
  categories: Cat[];
  user: HeaderUser;
  storeName: string;
  phone: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showCats, setShowCats] = useState(false);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const openMenu = () => {
      setShowCats(true);
      setOpen(true);
    };
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

  // Rendered through a portal into <body>. The sticky header uses backdrop-blur, and a
  // backdrop-filter makes fixed-position children size themselves to the header box instead
  // of the screen, which squashed the old drawer into the header.
  const drawer = (
    <div
      className={cn("fixed inset-0 z-[60] lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      aria-hidden={!open}
    >
      <div
        className={cn("absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
        onClick={close}
      />
      <div
        className={cn(
          "absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4">
          <Link href="/" onClick={close} className="flex items-center gap-2.5 font-extrabold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
              <ShoppingBag className="h-[18px] w-[18px]" />
            </span>
            <span className="text-lg tracking-tight">{storeName}</span>
          </Link>
          <button ref={closeRef} onClick={close} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4">
            {user ? (
              <Link href="/account" onClick={close} className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-brand-50 to-fuchsia-50 p-3.5 ring-1 ring-brand-100">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-slate-500">Welcome back</span>
                  <span className="block truncate font-semibold">{user.name}</span>
                </span>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </Link>
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold">Welcome!</p>
                <p className="mt-0.5 text-xs text-slate-500">Sign in for orders, wishlist and faster checkout.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link href="/login" onClick={close} className="btn-primary !py-2.5">Sign in</Link>
                  <Link href="/register" onClick={close} className="btn-secondary !py-2.5">Register</Link>
                </div>
              </div>
            )}
          </div>

          <nav className="px-3" aria-label="Mobile">
            {nav.map((n) => {
              const active = n.href === "/" ? pathname === "/" : pathname === n.href.split("?")[0] && !n.href.includes("?");
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={close}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-3 text-[15px] font-medium transition",
                    active ? "bg-brand-50 text-brand-700" : "text-slate-800 active:bg-slate-100"
                  )}
                >
                  {n.label}
                  <ChevronRight className={cn("h-4 w-4", active ? "text-brand-500" : "text-slate-300")} />
                </Link>
              );
            })}

            {categories.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCats((s) => !s)}
                  aria-expanded={showCats}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-[15px] font-medium text-slate-800 active:bg-slate-100"
                >
                  <span className="flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-slate-400" /> Categories</span>
                  <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", showCats && "rotate-180")} />
                </button>
                <div className={cn("grid transition-all duration-300", showCats ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                  <div className="overflow-hidden">
                    <div className="grid grid-cols-2 gap-2 px-1 pt-1 pb-3">
                      {categories.map((c) => (
                        <Link
                          key={c.slug}
                          href={`/products?category=${c.slug}`}
                          onClick={close}
                          tabIndex={showCats ? 0 : -1}
                          className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100"
                        >
                          <SafeImage src={c.image} alt={c.name} className="h-full w-full object-cover" />
                          <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                          <span className="absolute inset-x-2.5 bottom-2 text-left">
                            <span className="block text-sm font-semibold text-white">{c.name}</span>
                            <span className="text-[11px] text-white/75">{c.count} items</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Link href="/products?sale=1&sort=discount" onClick={close} className="mt-1 flex items-center justify-between rounded-xl bg-red-50 px-3 py-3 text-[15px] font-semibold text-red-600">
              <span>🔥 Hot deals</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </nav>

          <div className="mt-4 border-t border-slate-100 px-3 py-3">
            <p className="px-3 pb-1 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">My stuff</p>
            {[
              { href: "/account/orders", label: "My orders", icon: Package },
              { href: "/wishlist", label: "Wishlist", icon: Heart },
              { href: "/cart", label: "Cart", icon: ShoppingCart },
              ...(isStaff ? [{ href: "/admin", label: "Admin dashboard", icon: LayoutDashboard }] : []),
            ].map((l) => (
              <Link key={l.href} href={l.href} onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 active:bg-slate-100">
                <l.icon className="h-[18px] w-[18px] text-slate-400" /> {l.label}
              </Link>
            ))}
            {user && (
              <form action={logout}>
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-600 active:bg-red-50">
                  <LogOut className="h-[18px] w-[18px]" /> Sign out
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm"><Phone className="h-4 w-4 text-brand-600" /></span>
            <span>
              <span className="block text-xs text-slate-400">Need help? Call us</span>
              <span className="font-semibold">{phone}</span>
            </span>
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-800 transition hover:bg-slate-100 active:scale-95 lg:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        <Burger open={open} />
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
