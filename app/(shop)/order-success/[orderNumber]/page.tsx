import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";
import { SafeImage } from "@/components/ui/SafeImage";

export const metadata = { title: "Order confirmed" };

export default async function OrderSuccessPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const [order, settings] = await Promise.all([
    db.order.findUnique({ where: { orderNumber }, include: { items: true } }),
    getSettings(),
  ]);
  if (!order) notFound();
  // Only the buyer (or an admin) can view it; guest orders are viewable for 2 hours after purchase.
  const user = await getCurrentUser();
  const isOwner = order.userId ? user?.id === order.userId : Date.now() - order.createdAt.getTime() < 2 * 60 * 60 * 1000;
  if (!isOwner && user?.role !== "ADMIN") notFound();
  const fmt = (n: number) => formatPrice(n, settings.currency);

  return (
    <div className="container-x max-w-3xl py-16">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
        <h1 className="mt-4 text-3xl font-bold">Thank you for your order!</h1>
        <p className="mt-2 text-slate-500">
          Your order <span className="font-mono font-semibold text-slate-900">{order.orderNumber}</span> has been placed. A
          confirmation will be sent to <span className="font-medium text-slate-900">{order.email}</span>.
        </p>
      </div>

      <div className="card mt-10 p-6">
        <ul className="divide-y divide-slate-100">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 py-3">
              <SafeImage src={i.image} alt={i.name} className="h-14 w-14 rounded-lg object-cover" />
              <div className="flex-1">
                <p className="font-medium">{i.name}</p>
                <p className="text-sm text-slate-500">Qty {i.quantity}</p>
              </div>
              <p className="font-semibold">{fmt(i.price * i.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{fmt(order.subtotal)}</dd></div>
          {order.discount > 0 && (
            <div className="flex justify-between text-emerald-600"><dt>Discount ({order.couponCode})</dt><dd>−{fmt(order.discount)}</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-slate-500">Shipping</dt><dd>{order.shipping ? fmt(order.shipping) : "Free"}</dd></div>
          {order.tax > 0 && <div className="flex justify-between"><dt className="text-slate-500">Tax</dt><dd>{fmt(order.tax)}</dd></div>}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><dt>Total</dt><dd>{fmt(order.total)}</dd></div>
        </dl>
        <div className="mt-6 grid gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
          <div>
            <p className="font-semibold">Shipping to</p>
            <p className="mt-1 text-slate-600">
              {order.name}<br />{order.address}<br />{order.city}, {order.postalCode}<br />{order.country}
            </p>
          </div>
          <div>
            <p className="font-semibold">Payment</p>
            <p className="mt-1 text-slate-600">{order.paymentMethod === "COD" ? "Cash on delivery" : "Card"}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/products" className="btn-primary">Continue shopping</Link>
        {order.userId && <Link href={`/account/orders/${order.id}`} className="btn-secondary">Track order</Link>}
      </div>
    </div>
  );
}
