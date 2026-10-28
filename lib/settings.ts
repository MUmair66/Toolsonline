import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "./db";

export const SETTINGS_TAG = "settings";
export const CATALOG_TAG = "catalog";

async function loadSettings() {
  const existing = await db.setting.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return db.setting.create({ data: { id: 1 } });
}

/**
 * Store settings. Cached across requests (invalidated via revalidateTag(SETTINGS_TAG) when saved)
 * and de-duplicated within a request, so layout + header + footer + page share one lookup.
 */
export const getSettings = cache(unstable_cache(loadSettings, ["store-settings-v2"], { tags: [SETTINGS_TAG], revalidate: 300 }));

export type StoreSettings = Awaited<ReturnType<typeof getSettings>>;

/** Server-side source of truth for order totals. */
export function computeTotals(
  subtotal: number,
  discount: number,
  settings: { shippingFee: number; freeShippingThreshold: number; taxRate: number }
) {
  const afterDiscount = Math.max(0, subtotal - discount);
  const shipping =
    subtotal === 0 || (settings.freeShippingThreshold > 0 && afterDiscount >= settings.freeShippingThreshold)
      ? 0
      : settings.shippingFee;
  const tax = Math.round(afterDiscount * (settings.taxRate / 100) * 100) / 100;
  const total = Math.round((afterDiscount + shipping + tax) * 100) / 100;
  return { subtotal, discount, shipping, tax, total };
}
