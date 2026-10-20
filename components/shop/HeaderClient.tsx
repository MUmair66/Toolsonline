"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
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
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button onClick={() => setOpen(true)} className="-ml-2 rounded-xl p-2 text-slate-700 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
        <Menu className="h-6 w-6" strokeWidth={1.75} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="animate-in absolute inset-y-0 left-0 flex w-[340px] max-w-[88%] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <span className="flex items-center gap-2 font-extrabold">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                  <ShoppingBag className="h-4 w-4" />
                </span>
                {storeName}
              </span>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="border-b border-slate-100 p-5">
                {user ? (
                  <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="flex-1">
                      <span className="block text-xs text-slate-400">Signed in as</span>
                      <span className="block font-semibold">{user.name}</span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-slate-300" />
                  </Link>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/login" onClick={() => setOpen(false)} className="btn-primary">Sign in</Link>
                    <Link href="/register" onClick={() => setOpen(false)} className="btn-secondary">Register</Link>
                  </div>
                )}
              </div>

              <nav className="p-3" aria-label="Mobile">
                {nav.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-3 font-medium",
                      pathname === n.href.split("?")[0] && !n.href.includes("?") ? "bg-brand-50 text-brand-700" : "text-slate-800 hover:bg-slate-50"
                    )}
                  >
                    {n.label}
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </Link>
                ))}
                <Link href="/products?sale=1&sort=discount" onClick={() => setOpen(false)} className="mt-1 flex items-center justify-between rounded-xl bg-red-50 px-3 py-3 font-semibold text-red-600">
                  🔥 Hot deals <ChevronRight className="h-4 w-4" />
                </Link>
              </nav>

              {categories.length > 0 && (
                <div className="border-t border-slate-100 p-3">
                  <p className="px-3 pt-2 pb-3 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">Shop by category</p>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((c) => (
                      <Link
                        key={c.slug}
                        href={`/products?category=${c.slug}`}
                        onClick={() => setOpen(false)}
                        className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100"
                      >
                        <SafeImage src={c.image} alt={c.name} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <span className="absolute bottom-2 left-2.5 text-sm font-semibold text-white">{c.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 p-4">
              <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <Phone className="h-4 w-4 text-brand-600" />
                <span>
                  <span className="block text-xs text-slate-400">Need help? Call us</span>
                  <span className="font-semibold">{phone}</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
