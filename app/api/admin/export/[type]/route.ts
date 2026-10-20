import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasPerm, type Permission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { parseImages } from "@/lib/utils";
import { PRODUCT_CSV_HEADERS, PRODUCT_CSV_TEMPLATE, toCSV } from "@/lib/csv";

const PERM: Record<string, Permission> = {
  products: "products",
  template: "products",
  orders: "orders",
  customers: "customers",
  subscribers: "messages",
};

export async function GET(_: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const user = await getCurrentUser();
  const perm = PERM[type];
  if (!perm) return new Response("Unknown export", { status: 404 });
  if (!hasPerm(user, perm)) return new Response("Forbidden", { status: 403 });

  let csv = "";
  if (type === "template") csv = PRODUCT_CSV_TEMPLATE;

  if (type === "products") {
    const rows = await db.product.findMany({ include: { category: true }, orderBy: { name: "asc" } });
    csv = toCSV(
      PRODUCT_CSV_HEADERS,
      rows.map((p) => [p.name, p.description, p.price, p.comparePrice ?? "", p.stock, p.sku ?? "", p.category?.name ?? "", parseImages(p.images).join("|"), p.featured, p.active])
    );
  }

  if (type === "orders") {
    const rows = await db.order.findMany({ include: { items: true }, orderBy: { createdAt: "desc" } });
    csv = toCSV(
      ["orderNumber", "date", "customer", "email", "phone", "address", "city", "postalCode", "country", "items", "subtotal", "discount", "coupon", "shipping", "tax", "total", "payment", "paymentStatus", "status"],
      rows.map((o) => [
        o.orderNumber, o.createdAt, o.name, o.email, o.phone, o.address, o.city, o.postalCode, o.country,
        o.items.map((i) => `${i.quantity}x ${i.name}`).join("; "),
        o.subtotal, o.discount, o.couponCode ?? "", o.shipping, o.tax, o.total, o.paymentMethod, o.paymentStatus, o.status,
      ])
    );
  }

  if (type === "customers") {
    const rows = await db.user.findMany({ include: { _count: { select: { orders: true } } }, orderBy: { createdAt: "desc" } });
    csv = toCSV(
      ["name", "email", "role", "status", "phone", "city", "country", "orders", "joined", "lastLogin"],
      rows.map((u) => [u.name, u.email, u.role, u.active ? "active" : "suspended", u.phone ?? "", u.city ?? "", u.country ?? "", u._count.orders, u.createdAt, u.lastLoginAt ?? ""])
    );
  }

  if (type === "subscribers") {
    const rows = await db.subscriber.findMany({ orderBy: { createdAt: "desc" } });
    csv = toCSV(["email", "subscribed"], rows.map((s) => [s.email, s.createdAt]));
  }

  if (type !== "template") await logActivity(user, "export", type, `Exported ${type} to CSV`);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type === "template" ? "product-import-template" : `${type}-${date}`}.csv"`,
    },
  });
}
