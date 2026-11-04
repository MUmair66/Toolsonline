import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { visibleWhere } from "@/lib/products";
import { parseImages } from "@/lib/utils";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ products: [], categories: [] });
  const settings = await getSettings();
  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: { ...visibleWhere(settings), OR: [{ name: { contains: q } }, { description: { contains: q } }, { sku: { contains: q } }, { brand: { name: { contains: q } } }] },
      include: { category: { select: { name: true } }, brand: { select: { name: true } } },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
      take: 6,
    }),
    db.category.findMany({ where: { name: { contains: q } }, take: 3 }),
  ]);
  return NextResponse.json({
    products: products.map((p) => ({
      name: p.name,
      slug: p.slug,
      price: p.price,
      comparePrice: p.comparePrice,
      image: parseImages(p.images)[0] ?? "",
      category: [p.brand?.name, p.category?.name].filter(Boolean).join(" · ") || null,
    })),
    categories: categories.map((c) => ({ name: c.name, slug: c.slug })),
  });
}
