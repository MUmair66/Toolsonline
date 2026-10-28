"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Award,
  Bell,
  Bot,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Menu,
  MessageSquareText,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Ticket,
  Upload,
  Users,
  X,
} from "lucide-react";
import { logout } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { ROLES, type Permission } from "@/lib/permissions";

export type Notice = { text: string; href: string; tone: "info" | "warn" };
type BadgeKey = "orders" | "messages" | "reviews";
type NavItem = { href: string; label: string; icon: typeof Package; perm?: Permission; badge?: BadgeKey };

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart, perm: "orders", badge: "orders" },
      { href: "/admin/customers", label: "Customers", icon: Users, perm: "customers" },
      { href: "/admin/coupons", label: "Coupons", icon: Ticket, perm: "coupons" },
    ],
  },
  {
    title: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: Package, perm: "products" },
      { href: "/admin/products/import", label: "Bulk import", icon: Upload, perm: "products" },
      { href: "/admin/categories", label: "Categories", icon: FolderTree, perm: "categories" },
      { href: "/admin/brands", label: "Brands", icon: Award, perm: "categories" },
    ],
  },
  {
    title: "Engagement",
    items: [
      { href: "/admin/reviews", label: "Reviews", icon: MessageSquareText, perm: "reviews", badge: "reviews" },
      { href: "/admin/messages", label: "Inbox", icon: Mail, perm: "messages", badge: "messages" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/team", label: "Team & access", icon: ShieldCheck, perm: "team" },
      { href: "/admin/automations", label: "Automations", icon: Bot, perm: "settings" },
      { href: "/admin/activity", label: "Activity log", icon: Activity, perm: "activity" },
      { href: "/admin/settings", label: "Settings", icon: Settings, perm: "settings" },
    ],
  },
];

const COLLAPSE_KEY = "admin-sidebar-collapsed";
const GROUPS_KEY = "admin-sidebar-closed-groups";

export function AdminShell({
  children,
  storeName,
  user,
  perms,
  badges,
  notices,
}: {
  children: React.ReactNode;
  storeName: string;
  user: { name: string; email: string; role: string };
  perms: Permission[];
  badges: Record<BadgeKey, number>;
  notices: Notice[];
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [closedGroups, setClosedGroups] = useState<string[]>([]);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
      setClosedGroups(JSON.parse(localStorage.getItem(GROUPS_KEY) || "[]"));
    } catch {}
  }, []);
  useEffect(() => setMobileOpen(false), [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  };
  const toggleGroup = (title: string) => {
    setClosedGroups((prev) => {
      const next = prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title];
      try {
        localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.perm || perms.includes(i.perm)) })).filter((g) => g.items.length);
  const allItems = groups.flatMap((g) => g.items);
  // Longest matching href wins so "/admin/products/import" doesn't also light up "/admin/products".
  const activeHref = allItems
    .filter((i) => (i.href === "/admin" ? pathname === "/admin" : pathname === i.href || pathname.startsWith(i.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const roleLabel = ROLES[user.role as keyof typeof ROLES] ?? user.role;

  const sidebar = (mini: boolean) => (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white">
      {/* Brand */}
      <div className={cn("flex h-16 shrink-0 items-center gap-3 border-b border-slate-100", mini ? "justify-center px-2" : "px-5")}>
        <Link href="/admin" className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/emblem.png" alt="" width={36} height={36} className="h-9 w-9 shrink-0" />
          {!mini && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[15px] font-bold text-slate-900">{storeName}</span>
              <span className="block text-[11px] font-medium text-slate-400">Admin console</span>
            </span>
          )}
        </Link>
      </div>

      {/* Search */}
      <div className={cn("shrink-0 pt-4", mini ? "px-3" : "px-4")}>
        <button
          onClick={() => setPaletteOpen(true)}
          title="Search (Ctrl K)"
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-400 transition hover:border-slate-300 hover:bg-white hover:text-slate-600",
            mini ? "h-10 justify-center" : "h-9 px-3"
          )}
        >
          <Search className="h-4 w-4 shrink-0" />
          {!mini && (
            <>
              <span>Search…</span>
              <kbd className="ml-auto rounded border border-slate-200 bg-white px-1.5 font-mono text-[10px] text-slate-400">Ctrl K</kbd>
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 overflow-y-auto py-4", mini ? "px-3" : "px-3")} aria-label="Admin">
        {groups.map((g, gi) => {
          const closed = !mini && closedGroups.includes(g.title);
          const groupHasActive = g.items.some((i) => i.href === activeHref);
          return (
            <div key={g.title} className={cn(gi > 0 && (mini ? "mt-3 border-t border-slate-100 pt-3" : "mt-5"))}>
              {!mini && g.title !== "Overview" && (
                <button
                  onClick={() => toggleGroup(g.title)}
                  className="mb-1 flex w-full items-center justify-between rounded-md px-3 py-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase hover:text-slate-600"
                  aria-expanded={!closed}
                >
                  {g.title}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", closed && "-rotate-90", groupHasActive && closed && "text-brand-600")} />
                </button>
              )}
              {!closed && (
                <ul className="space-y-0.5">
                  {g.items.map((n) => {
                    const count = n.badge ? badges[n.badge] : 0;
                    const active = n.href === activeHref;
                    return (
                      <li key={n.href} className="group/item relative">
                        <Link
                          href={n.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "relative flex items-center rounded-lg text-sm font-medium transition-colors",
                            mini ? "h-10 justify-center" : "h-9 gap-3 px-3",
                            active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          {active && !mini && <span className="absolute top-1.5 bottom-1.5 -left-3 w-1 rounded-r-full bg-brand-600" />}
                          <n.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand-600" : "text-slate-400 group-hover/item:text-slate-600")} strokeWidth={active ? 2.2 : 1.9} />
                          {!mini && <span className="truncate">{n.label}</span>}
                          {count > 0 &&
                            (mini ? (
                              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                            ) : (
                              <span
                                className={cn(
                                  "ml-auto rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                                  n.badge === "orders" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"
                                )}
                              >
                                {count}
                              </span>
                            ))}
                        </Link>
                        {mini && (
                          <span className="pointer-events-none absolute top-1/2 left-full z-50 ml-3 -translate-y-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition group-hover/item:opacity-100">
                            {n.label}
                            {count > 0 && <span className="ml-1.5 rounded bg-white/20 px-1">{count}</span>}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn("shrink-0 space-y-2 border-t border-slate-100", mini ? "p-3" : "p-4")}>
        {!mini && (
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between rounded-xl bg-gradient-to-br from-brand-50 to-amber-50 px-3.5 py-3 text-sm ring-1 ring-brand-100 transition hover:ring-brand-200"
          >
            <span>
              <span className="block font-semibold text-slate-900">View your store</span>
              <span className="text-xs text-slate-500">Opens in a new tab</span>
            </span>
            <ExternalLink className="h-4 w-4 text-brand-600" />
          </Link>
        )}
        <div className={cn("flex items-center gap-3 rounded-xl", mini ? "flex-col" : "p-1")}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-sm font-bold text-white" title={`${user.name} · ${roleLabel}`}>
            {user.name.charAt(0).toUpperCase()}
          </span>
          {!mini && (
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-semibold text-slate-900">{user.name}</span>
              <span className="block truncate text-xs text-slate-500">{roleLabel}</span>
            </span>
          )}
          <form action={logout}>
            <button className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600" title="Sign out" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  const crumbs = pathname.split("/").filter(Boolean).slice(1);
  const current = allItems.find((i) => i.href === activeHref);

  return (
    <div className="min-h-screen bg-slate-50/70">
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 lg:block print:hidden", collapsed ? "w-[76px]" : "w-64")}>
        {sidebar(collapsed)}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="animate-in absolute inset-y-0 left-0 w-72 shadow-2xl">
            {sidebar(false)}
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 -right-12 rounded-lg bg-white p-2 shadow" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className={cn("transition-[padding] duration-200 print:pl-0", collapsed ? "lg:pl-[76px]" : "lg:pl-64")}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur-md sm:px-6 print:hidden">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={toggleCollapsed}
            className="hidden rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:block"
            title={collapsed ? "Expand sidebar (Ctrl B)" : "Collapse sidebar (Ctrl B)"}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
          <div className="hidden h-6 w-px bg-slate-200 lg:block" />
          <nav className="flex min-w-0 items-center gap-1.5 text-sm" aria-label="Breadcrumb">
            {current && <current.icon className="h-4 w-4 shrink-0 text-slate-400" />}
            <Link href="/admin" className="text-slate-500 hover:text-slate-900">Admin</Link>
            {crumbs.map((c, i) => (
              <span key={i} className="flex min-w-0 items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                <span className={cn("truncate capitalize", i === crumbs.length - 1 ? "font-semibold text-slate-900" : "text-slate-500")}>
                  {c.length > 20 ? "Details" : c.replace(/-/g, " ")}
                </span>
              </span>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setPaletteOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Search">
              <Search className="h-5 w-5" />
            </button>
            <Link href="/" target="_blank" className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:flex">
              <ExternalLink className="h-4 w-4" /> Store
            </Link>
            <NotificationBell notices={notices} />
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      {paletteOpen && <CommandPalette items={allItems} perms={perms} onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}

function NotificationBell({ notices }: { notices: Notice[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {notices.length > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {notices.length}
          </span>
        )}
      </button>
      {open && (
        <div className="animate-in absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">Notifications</p>
          {notices.length ? (
            notices.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 border-b border-slate-50 px-4 py-3 text-sm hover:bg-slate-50"
              >
                <span className={cn("h-2 w-2 shrink-0 rounded-full", n.tone === "warn" ? "bg-amber-500" : "bg-brand-600")} />
                {n.text}
                <ChevronRight className="ml-auto h-4 w-4 text-slate-300" />
              </Link>
            ))
          ) : (
            <p className="px-4 py-8 text-center text-sm text-slate-500">You&apos;re all caught up 🎉</p>
          )}
        </div>
      )}
    </div>
  );
}

type Result = { type: string; label: string; sub?: string; href: string };

function CommandPalette({ items, perms, onClose }: { items: NavItem[]; perms: Permission[]; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);

  const actions: (Result & { perm?: Permission })[] = [
    { type: "Action", label: "Add a new product", href: "/admin/products/new", perm: "products" },
    { type: "Action", label: "Import products from CSV", href: "/admin/products/import", perm: "products" },
    { type: "Action", label: "Create a coupon", href: "/admin/coupons/new", perm: "coupons" },
    { type: "Action", label: "Invite a team member", href: "/admin/team/new", perm: "team" },
    { type: "Action", label: "Open the storefront", href: "/" },
  ];
  const pages: Result[] = items.map((i) => ({ type: "Page", label: i.label, href: i.href }));
  const ql = q.toLowerCase();
  const allowed = actions.filter((a) => !a.perm || perms.includes(a.perm));
  const local = [...pages, ...allowed].filter((r) => !q || r.label.toLowerCase().includes(ql));
  const all = [...(q ? results : []), ...local].slice(0, 14);

  useEffect(() => {
    setIndex(0);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {}
      setLoading(false);
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (r?: Result) => {
    if (!r) return;
    onClose();
    router.push(r.href);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/50 p-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div className="animate-in w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
          {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : <Search className="h-5 w-5 text-slate-400" />}
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(all.length - 1, i + 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              }
              if (e.key === "Enter") go(all[index]);
            }}
            placeholder="Search products, orders, customers or pages…"
            className="h-14 flex-1 bg-transparent text-sm focus:outline-none"
          />
          <kbd className="rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">ESC</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {all.map((r, i) => (
            <li key={r.type + r.href + i}>
              <button
                onMouseEnter={() => setIndex(i)}
                onClick={() => go(r)}
                className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm", i === index ? "bg-brand-50 text-brand-900" : "text-slate-700")}
              >
                <span className="w-16 shrink-0 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">{r.type}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.label}</span>
                  {r.sub && <span className="block truncate text-xs text-slate-500">{r.sub}</span>}
                </span>
                {i === index && <ChevronRight className="h-4 w-4 text-brand-600" />}
              </button>
            </li>
          ))}
          {!all.length && <li className="px-3 py-10 text-center text-sm text-slate-500">{loading ? "Searching…" : "No results"}</li>}
        </ul>
        <div className="flex gap-4 border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-400">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
