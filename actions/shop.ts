"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { computeTotals, getSettings } from "@/lib/settings";
import { evaluateCoupon } from "@/lib/coupon";
import { generateOrderNumber, parseImages } from "@/lib/utils";
import type { FormState } from "./auth";

/* ---------------- Coupons ---------------- */

export async function applyCoupon(code: string, subtotal: number) {
  if (!code.trim()) return { ok: false as const, error: "Enter a coupon code" };
  const res = await evaluateCoupon(code, subtotal);
  if (!res.ok) return res;
  return { ok: true as const, code: res.coupon.code, discount: res.discount };
}

/* ---------------- Checkout ---------------- */

type CheckoutInput = {
  items: { productId: string; quantity: number }[];
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  notes?: string;
  paymentMethod: "COD" | "CARD";
  couponCode?: string;
  saveAddress?: boolean;
};

export async function placeOrder(
  input: CheckoutInput
): Promise<{ ok: true; orderNumber: string } | { ok: false; error: string }> {
  const required: (keyof CheckoutInput)[] = ["name", "email", "phone", "address", "city", "postalCode", "country"];
  for (const k of required) {
    if (!String(input[k] ?? "").trim()) return { ok: false, error: "Please fill in all required fields." };
  }
  if (!/^\S+@\S+\.\S+$/.test(input.email)) return { ok: false, error: "Please enter a valid email." };
  if (!input.items?.length) return { ok: false, error: "Your cart is empty." };

  const user = await getCurrentUser();
  const settings = await getSettings();

  const ids = input.items.map((i) => i.productId);
  const products = await db.product.findMany({ where: { id: { in: ids }, active: true } });

  const lines: { productId: string; name: string; image: string | null; price: number; quantity: number }[] = [];
  for (const item of input.items) {
    const p = products.find((x) => x.id === item.productId);
    const qty = Math.floor(Number(item.quantity));
    if (!p) return { ok: false, error: "A product in your cart is no longer available. Please review your cart." };
    if (qty < 1) return { ok: false, error: "Invalid quantity." };
    if (p.stock < qty) return { ok: false, error: `Only ${p.stock} left in stock for "${p.name}".` };
    lines.push({ productId: p.id, name: p.name, image: parseImages(p.images)[0] ?? null, price: p.price, quantity: qty });
  }

  const subtotal = Math.round(lines.reduce((s, l) => s + l.price * l.quantity, 0) * 100) / 100;

  let discount = 0;
  let couponCode: string | null = null;
  if (input.couponCode?.trim()) {
    const res = await evaluateCoupon(input.couponCode, subtotal);
    if (!res.ok) return { ok: false, error: res.error };
    discount = res.discount;
    couponCode = res.coupon.code;
  }

  const totals = computeTotals(subtotal, discount, settings);
  const orderNumber = generateOrderNumber();

  try {
    await db.$transaction(async (tx) => {
      for (const l of lines) {
        const updated = await tx.product.updateMany({
          where: { id: l.productId, stock: { gte: l.quantity } },
          data: { stock: { decrement: l.quantity } },
        });
        if (updated.count === 0) throw new Error(`"${l.name}" just went out of stock.`);
      }
      if (couponCode) {
        await tx.coupon.update({ where: { code: couponCode }, data: { usedCount: { increment: 1 } } });
      }
      await tx.order.create({
        data: {
          orderNumber,
          userId: user?.id ?? null,
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          phone: input.phone.trim(),
          address: input.address.trim(),
          city: input.city.trim(),
          postalCode: input.postalCode.trim(),
          country: input.country.trim(),
          notes: input.notes?.trim() || null,
          paymentMethod: input.paymentMethod === "CARD" ? "CARD" : "COD",
          paymentStatus: input.paymentMethod === "CARD" ? "PAID" : "PENDING",
          couponCode,
          ...totals,
          items: { create: lines },
        },
      });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not place order." };
  }

  if (user && input.saveAddress) {
    const a = { name: input.name.trim(), phone: input.phone.trim(), address: input.address.trim(), city: input.city.trim(), postalCode: input.postalCode.trim(), country: input.country.trim() };
    const dup = await db.address.findFirst({ where: { userId: user.id, address: a.address, city: a.city, postalCode: a.postalCode } });
    if (!dup) {
      const isFirst = (await db.address.count({ where: { userId: user.id } })) === 0;
      await db.address.create({ data: { ...a, userId: user.id, label: "Home", isDefault: isFirst } });
    }
  }

  revalidatePath("/admin");
  return { ok: true, orderNumber };
}

/* ---------------- Reviews ---------------- */

export async function submitReview(productId: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in to write a review." };
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") || "").trim();
  if (!(rating >= 1 && rating <= 5)) return { error: "Please select a rating." };
  if (comment.length < 3) return { error: "Please write a short comment." };

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return { error: "Product not found." };

  const settings = await getSettings();
  await db.review.create({ data: { rating, comment, userId: user.id, productId, approved: !settings.reviewModeration } });
  revalidatePath(`/products/${product.slug}`);
  return {
    success: settings.reviewModeration
      ? "Thanks! Your review will appear once it's approved."
      : "Thanks! Your review has been posted.",
  };
}

/* ---------------- Newsletter ---------------- */

export async function subscribe(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Please enter a valid email." };
  await db.subscriber.upsert({ where: { email }, update: {}, create: { email } });
  return { success: "You're subscribed! Watch your inbox for exclusive deals." };
}

/* ---------------- Contact ---------------- */

export async function sendMessage(_: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const subject = String(formData.get("subject") || "").trim() || "General enquiry";
  const message = String(formData.get("message") || "").trim();
  if (!name || !email || !message) return { error: "Please fill in all fields." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Please enter a valid email." };
  await db.message.create({ data: { name, email, subject, message } });
  return { success: "Message sent! We'll get back to you within 24 hours." };
}

/* ---------------- Account ---------------- */

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not logged in." };
  const name = String(formData.get("name") || "").trim();
  if (name.length < 2) return { error: "Name is required." };
  const get = (k: string) => String(formData.get(k) || "").trim() || null;
  await db.user.update({
    where: { id: user.id },
    data: {
      name,
      phone: get("phone"),
      address: get("address"),
      city: get("city"),
      postalCode: get("postalCode"),
      country: get("country"),
    },
  });
  revalidatePath("/account");
  return { success: "Profile updated." };
}

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const current = await getCurrentUser();
  if (!current) return { error: "Not logged in." };
  const oldPw = String(formData.get("current") || "");
  const newPw = String(formData.get("password") || "");
  if (newPw.length < 6) return { error: "New password must be at least 6 characters." };
  const user = await db.user.findUnique({ where: { id: current.id } });
  if (!user || !(await bcrypt.compare(oldPw, user.password))) return { error: "Current password is incorrect." };
  await db.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPw, 10) } });
  return { success: "Password changed." };
}

export async function cancelMyOrder(orderId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const order = await db.order.findFirst({ where: { id: orderId, userId: user.id }, include: { items: true } });
  if (!order || order.status !== "PENDING") return;
  await db.$transaction([
    db.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } }),
    ...order.items
      .filter((i) => i.productId)
      .map((i) => db.product.update({ where: { id: i.productId! }, data: { stock: { increment: i.quantity } } })),
  ]);
  revalidatePath("/account");
  revalidatePath(`/account/orders/${order.id}`);
}
