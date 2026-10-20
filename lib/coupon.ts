import "server-only";
import { db } from "./db";

export async function evaluateCoupon(code: string, subtotal: number) {
  const coupon = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon || !coupon.active) return { ok: false as const, error: "Invalid coupon code" };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { ok: false as const, error: "This coupon has expired" };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses)
    return { ok: false as const, error: "This coupon has reached its usage limit" };
  if (subtotal < coupon.minOrder)
    return { ok: false as const, error: `Minimum order of ${coupon.minOrder.toFixed(2)} required` };

  const raw = coupon.type === "PERCENT" ? (subtotal * coupon.value) / 100 : coupon.value;
  const discount = Math.min(subtotal, Math.round(raw * 100) / 100);
  return { ok: true as const, coupon, discount };
}
