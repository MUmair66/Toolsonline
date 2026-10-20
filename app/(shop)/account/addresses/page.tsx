import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { AddressManager } from "@/components/account/AddressManager";

export const metadata: Metadata = { title: "My addresses" };

export default async function AddressesPage() {
  const user = await requireUser();
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Addresses</h1>
        <p className="mt-1 text-sm text-slate-500">Saved addresses fill in automatically at checkout.</p>
      </div>
      <AddressManager addresses={addresses} defaults={{ name: user.name, phone: user.phone ?? "" }} />
    </div>
  );
}
