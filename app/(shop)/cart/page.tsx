import type { Metadata } from "next";
import { CartView } from "@/components/shop/CartView";

export const metadata: Metadata = { title: "Shopping cart" };

export default function CartPage() {
  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-bold">Shopping cart</h1>
      <CartView />
    </div>
  );
}
