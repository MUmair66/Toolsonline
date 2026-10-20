import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { hasPerm, PERMISSIONS, type Permission } from "@/lib/permissions";
import { AdminShell, type Notice } from "@/components/admin/AdminShell";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const settings = await getSettings();
  const perms = PERMISSIONS.map((p) => p.key).filter((k) => hasPerm(user, k)) as Permission[];
  const can = (p: Permission) => perms.includes(p);

  const [pendingOrders, lowStock, unread, pendingReviews] = await Promise.all([
    can("orders") ? db.order.count({ where: { status: "PENDING" } }) : 0,
    can("products") ? db.product.count({ where: { stock: { lte: settings.lowStockThreshold } } }) : 0,
    can("messages") ? db.message.count({ where: { read: false } }) : 0,
    can("reviews") ? db.review.count({ where: { approved: false } }) : 0,
  ]);

  const notices: Notice[] = [];
  if (pendingOrders) notices.push({ text: `${pendingOrders} order${pendingOrders > 1 ? "s" : ""} waiting to be processed`, href: "/admin/orders?status=PENDING", tone: "info" });
  if (lowStock) notices.push({ text: `${lowStock} product${lowStock > 1 ? "s" : ""} low on stock`, href: "/admin/products?status=low", tone: "warn" });
  if (unread) notices.push({ text: `${unread} unread message${unread > 1 ? "s" : ""}`, href: "/admin/messages?filter=unread", tone: "info" });
  if (pendingReviews) notices.push({ text: `${pendingReviews} review${pendingReviews > 1 ? "s" : ""} awaiting approval`, href: "/admin/reviews?status=hidden", tone: "info" });

  return (
    <AdminShell
      storeName={settings.storeName}
      user={{ name: user.name, email: user.email, role: user.role }}
      perms={perms}
      badges={{ orders: pendingOrders, messages: unread, reviews: pendingReviews }}
      notices={notices}
    >
      {children}
    </AdminShell>
  );
}
