import type { Metadata } from "next";
import { WishlistView } from "@/components/shop/WishlistView";

export const metadata: Metadata = { title: "Wishlist" };

export default function AccountWishlistPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Wishlist</h1>
      <p className="mt-1 text-sm text-slate-500">Items you&apos;ve saved for later.</p>
      <WishlistView compact />
    </div>
  );
}
