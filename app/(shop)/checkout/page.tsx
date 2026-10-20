import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CheckoutForm } from "@/components/shop/CheckoutForm";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  const addresses = user
    ? await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] })
    : [];
  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <CheckoutForm
        addresses={addresses}
        user={
          user
            ? {
                name: user.name,
                email: user.email,
                phone: user.phone ?? "",
                address: user.address ?? "",
                city: user.city ?? "",
                postalCode: user.postalCode ?? "",
                country: user.country ?? "",
              }
            : null
        }
      />
    </div>
  );
}
