import type { Metadata } from "next";
import { WishlistView } from "@/components/shop/WishlistView";

export const metadata: Metadata = { title: "Wishlist" };

export default function WishlistPage() {
  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-bold">My wishlist</h1>
      <WishlistView />
    </div>
  );
}
