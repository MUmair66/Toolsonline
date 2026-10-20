"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LayoutDashboard, LogOut, MapPin, Package, Settings, ShieldCheck, Star, User } from "lucide-react";
import { logout } from "@/actions/auth";
import { useWishlist } from "@/components/providers/WishlistProvider";
import { cn } from "@/lib/utils";

type Counts = { orders: number; addresses: number; reviews: number };

const ITEMS = [
  { href: "/account", label: "Overview", icon: LayoutDashboard },
  { href: "/account/orders", label: "My orders", icon: Package, count: "orders" as const },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart, count: "wishlist" as const },
  { href: "/account/addresses", label: "Addresses", icon: MapPin, count: "addresses" as const },
  { href: "/account/reviews", label: "My reviews", icon: Star, count: "reviews" as const },
  { href: "/account/settings", label: "Profile & security", icon: Settings },
];

export function AccountNav({
  user,
  tier,
  counts,
}: {
  user: { name: string; email: string; staff: boolean };
  tier: { name: string; color: string; points: number };
  counts: Counts;
}) {
  const pathname = usePathname();
  const wishlist = useWishlist();
  const all = { ...counts, wishlist: wishlist.items.length };
  const isActive = (href: string) => (href === "/account" ? pathname === "/account" : pathname.startsWith(href));

  return (
    <aside className="lg:w-72 lg:shrink-0">
      <div className="lg:sticky lg:top-36">
        {/* Profile card */}
        <div className="card overflow-hidden">
          <div className={cn("bg-gradient-to-br px-5 pt-5 pb-10 text-white", tier.color)}>
            <p className="text-[11px] font-semibold tracking-widest text-white/80 uppercase">{tier.name} member</p>
            <p className="mt-1 text-2xl font-bold">{tier.points.toLocaleString()} <span className="text-sm font-medium text-white/80">points</span></p>
          </div>
          <div className="-mt-7 flex items-end gap-3 px-5 pb-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-bold text-brand-700 shadow-lg ring-4 ring-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 pb-0.5">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Nav: horizontal scroll on mobile, vertical on desktop */}
        <nav className="card mt-4 flex gap-1 overflow-x-auto p-2 lg:flex-col" aria-label="Account">
          {ITEMS.map((i) => {
            const active = isActive(i.href);
            const n = i.count ? all[i.count] : 0;
            return (
              <Link
                key={i.href}
                href={i.href}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition",
                  active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <i.icon className={cn("h-[18px] w-[18px]", active ? "text-brand-600" : "text-slate-400")} />
                {i.label}
                {n > 0 && (
                  <span className={cn("ml-auto rounded-md px-1.5 py-0.5 text-[11px] font-semibold", active ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500")}>
                    {n}
                  </span>
                )}
              </Link>
            );
          })}
          <div className="my-1 hidden border-t border-slate-100 lg:block" />
          {user.staff && (
            <Link href="/admin" className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold whitespace-nowrap text-brand-700 hover:bg-brand-50">
              <ShieldCheck className="h-[18px] w-[18px]" /> Admin dashboard
            </Link>
          )}
          <form action={logout} className="shrink-0">
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-red-50 hover:text-red-600">
              <LogOut className="h-[18px] w-[18px] text-slate-400" /> Sign out
            </button>
          </form>
        </nav>

        <Link href="/contact" className="mt-4 hidden items-center gap-3 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 hover:border-brand-400 hover:text-brand-700 lg:flex">
          <User className="h-5 w-5 text-slate-400" />
          <span>
            <span className="block font-semibold text-slate-900">Need help?</span>
            Our support team replies within 24h.
          </span>
        </Link>
      </div>
    </aside>
  );
}
