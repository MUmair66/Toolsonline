"use server";

import { db } from "@/lib/db";
import { requirePerm, requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/utils";
import { generate, type AiMessage } from "@/lib/ai";
import { chatSystem, cleanCopy, copyPrompt, copySystem, isCopyMode, type CopyMode } from "@/lib/ai-prompts";
import { STORE } from "@/lib/store";

type Result = { text: string } | { error: string };

/* ---------------- Product description writer ---------------- */

export async function aiProductCopy(input: { mode: CopyMode; name: string; brand?: string; category?: string; description?: string }): Promise<Result> {
  await requirePerm("products");
  const name = (input.name ?? "").trim().slice(0, 300);
  if (!name) return { error: "Enter the product name first." };
  const mode: CopyMode = isCopyMode(input.mode) ? input.mode : "write";
  const description = (input.description ?? "").trim().slice(0, 6000);
  if (mode !== "write" && !description) return { error: "There is no description to improve yet. Use “Write” first." };

  const res = await generate({
    system: copySystem(STORE.city),
    messages: [{ role: "user", text: copyPrompt(mode, { name, brand: input.brand?.slice(0, 100), category: input.category?.slice(0, 100), description }) }],
    temperature: mode === "write" ? 0.7 : 0.5,
  });
  return "error" in res ? res : { text: cleanCopy(res.text) };
}

/* ---------------- General admin assistant ---------------- */

/** Live, non-personal store facts so the assistant can give grounded answers (no customer data). */
async function storeFacts() {
  const s = await getSettings();
  const [products, outOfStock, lowStock, pendingOrders, categories, brands] = await Promise.all([
    db.product.count({ where: { active: true } }),
    db.product.count({ where: { active: true, stock: { lte: 0 } } }),
    db.product.count({ where: { active: true, stock: { gt: 0, lte: s.lowStockThreshold } } }),
    db.order.count({ where: { status: "PENDING" } }),
    db.category.findMany({ select: { name: true, _count: { select: { products: true } } }, orderBy: { name: "asc" } }),
    db.brand.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
  ]);
  const fmt = (n: number) => formatPrice(n, s.currency);
  return `Store facts (live):
- Store: ${s.storeName} (toolsonline.pk), power tools and machinery. Address: ${STORE.address}.
- Phones: ${STORE.phones.join(", ")}. WhatsApp: ${STORE.whatsappDisplay}.
- Currency: ${s.currency}. Delivery: ${s.freeShippingThreshold > 0 ? `free over ${fmt(s.freeShippingThreshold)}, otherwise ${fmt(s.shippingFee)}` : `flat ${fmt(s.shippingFee)}`}. Payment: cash on delivery or card.
- Products: ${products} visible, ${outOfStock} out of stock, ${lowStock} low on stock (≤${s.lowStockThreshold}). Pending orders: ${pendingOrders}.
- Brands: ${brands.map((b) => b.name).join(", ") || "none"}.
- Categories: ${categories.map((c) => `${c.name} (${c._count.products})`).join(", ")}.`;
}

export async function aiChat(history: AiMessage[]): Promise<Result> {
  const me = await requireStaff();
  const messages = (Array.isArray(history) ? history : [])
    .filter((m) => (m?.role === "user" || m?.role === "model") && typeof m.text === "string" && m.text.trim())
    .slice(-20)
    .map((m) => ({ role: m.role, text: m.text.slice(0, 6000) }));
  if (!messages.length || messages[messages.length - 1].role !== "user") return { error: "Type a message first." };

  return generate({ system: chatSystem(me.name, await storeFacts()), messages, temperature: 0.7, maxOutputTokens: 4096 });
}
