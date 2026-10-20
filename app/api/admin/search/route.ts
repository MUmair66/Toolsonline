import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasPerm, isStaffRole } from "@/lib/permissions";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const [products, orders, customers] = await Promise.all([
    hasPerm(user, "products")
      ? db.product.findMany({ where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] }, take: 5 })
      : [],
    hasPerm(user, "orders")
      ? db.order.findMany({
          where: { OR: [{ orderNumber: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : [],
    hasPerm(user, "customers")
      ? db.user.findMany({ where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }, take: 5 })
      : [],
  ]);

  return NextResponse.json({
    results: [
      ...products.map((p) => ({ type: "Product", label: p.name, sub: `${p.sku ?? "No SKU"} · ${p.stock} in stock`, href: `/admin/products/${p.id}` })),
      ...orders.map((o) => ({ type: "Order", label: o.orderNumber, sub: `${o.name} · ${o.status.toLowerCase()}`, href: `/admin/orders/${o.id}` })),
      ...customers.map((c) => ({ type: "Customer", label: c.name, sub: c.email, href: `/admin/customers/${c.id}` })),
    ],
  });
}
