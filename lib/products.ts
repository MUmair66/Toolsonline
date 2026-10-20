import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

/** Base filter for products customers may see (respects the auto-hide-out-of-stock automation). */
export function visibleWhere(settings: { autoHideOutOfStock: boolean }): Prisma.ProductWhereInput {
  return settings.autoHideOutOfStock ? { active: true, stock: { gt: 0 } } : { active: true };
}

/** Attach average rating + review count to a list of products. */
export async function withRatings<T extends { id: string }>(products: T[]) {
  if (!products.length) return [] as (T & { rating: number; reviewCount: number })[];
  const stats = await db.review.groupBy({
    by: ["productId"],
    where: { productId: { in: products.map((p) => p.id) }, approved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const map = new Map(stats.map((s) => [s.productId, s]));
  return products.map((p) => ({
    ...p,
    rating: map.get(p.id)?._avg.rating ?? 0,
    reviewCount: map.get(p.id)?._count._all ?? 0,
  }));
}

/** IDs of products whose approved-review average is at least `min`. */
export async function productIdsWithRating(min: number) {
  const rows = await db.review.groupBy({
    by: ["productId"],
    where: { approved: true },
    _avg: { rating: true },
    having: { rating: { _avg: { gte: min } } },
  });
  return rows.map((r) => r.productId);
}
