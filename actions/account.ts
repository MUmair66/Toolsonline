"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { destroySession, getCurrentUser } from "@/lib/auth";
import type { FormState } from "./auth";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/* ---------------- Addresses ---------------- */

export async function saveAddress(id: string | null, _: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  const data = {
    label: ["Home", "Work", "Other"].includes(str(fd, "label")) ? str(fd, "label") : "Home",
    name: str(fd, "name"),
    phone: str(fd, "phone"),
    address: str(fd, "address"),
    city: str(fd, "city"),
    postalCode: str(fd, "postalCode"),
    country: str(fd, "country"),
  };
  if (Object.values(data).some((v) => !v)) return { error: "Please fill in every field." };
  const makeDefault = fd.get("isDefault") === "on" || (await db.address.count({ where: { userId: user.id } })) === 0;

  if (id) {
    const own = await db.address.findFirst({ where: { id, userId: user.id } });
    if (!own) return { error: "Address not found." };
  }
  await db.$transaction(async (tx) => {
    if (makeDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    if (id) await tx.address.update({ where: { id }, data: { ...data, ...(makeDefault ? { isDefault: true } : {}) } });
    else await tx.address.create({ data: { ...data, userId: user.id, isDefault: makeDefault } });
  });
  revalidatePath("/account", "layout");
  return { success: id ? "Address updated." : "Address added." };
}

export async function deleteAddress(id: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const addr = await db.address.findFirst({ where: { id, userId: user.id } });
  if (!addr) return;
  await db.address.delete({ where: { id } });
  if (addr.isDefault) {
    const next = await db.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
    if (next) await db.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  revalidatePath("/account", "layout");
}

export async function setDefaultAddress(id: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const addr = await db.address.findFirst({ where: { id, userId: user.id } });
  if (!addr) return;
  await db.$transaction([
    db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    db.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/account", "layout");
}

/* ---------------- Reviews ---------------- */

export async function deleteMyReview(id: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const r = await db.review.findFirst({ where: { id, userId: user.id }, include: { product: { select: { slug: true } } } });
  if (!r) return;
  await db.review.delete({ where: { id } });
  revalidatePath("/account/reviews");
  revalidatePath(`/products/${r.product.slug}`);
}

/* ---------------- Danger zone ---------------- */

export async function deleteMyAccount(_: FormState, fd: FormData): Promise<FormState> {
  const current = await getCurrentUser();
  if (!current) return { error: "Please sign in again." };
  if (current.role !== "CUSTOMER") return { error: "Team accounts must be removed by a super admin." };
  if (str(fd, "confirm") !== "DELETE") return { error: 'Type DELETE to confirm.' };
  const user = await db.user.findUnique({ where: { id: current.id } });
  if (!user || !(await bcrypt.compare(String(fd.get("password") || ""), user.password))) return { error: "Password is incorrect." };
  await db.user.delete({ where: { id: user.id } }); // orders are kept (userId set to null)
  await destroySession();
  redirect("/?account=deleted");
}
