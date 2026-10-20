import { requirePerm } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/utils";
import { deleteOrder } from "@/actions/admin";
import { StatusBadge } from "@/components/admin/ui";
import { OrderUpdateForm } from "@/components/admin/Forms";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { SafeImage } from "@/components/ui/SafeImage";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata = { title: "Order details" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePerm("orders");
  const { id } = await params;
  const [order, settings] = await Promise.all([
    db.order.findUnique({ where: { id }, include: { items: true, user: { select: { id: true, name: true } } } }),
    getSettings(),
  ]);
  if (!order) notFound();
  const fmt = (n: number) => formatPrice(n, settings.currency);

  return (
    <div>
      <Link href="/admin/orders" className="text-sm font-semibold text-brand-600 hover:underline print:hidden">← All orders</Link>
      <div className="mt-3 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Order <span className="font-mono">{order.orderNumber}</span></h1>
          <p className="text-sm text-slate-500">
            Placed {new Date(order.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.paymentStatus} />
          <PrintButton />
          <ConfirmButton action={deleteOrder.bind(null, order.id)} message="Permanently delete this order?" className="btn-ghost !p-2 text-red-600 hover:!bg-red-50" title="Delete order">
            <Trash2 className="h-4 w-4" />
          </ConfirmButton>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="card overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Product</th><th>Price</th><th>Qty</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <SafeImage src={i.image} alt={i.name} className="h-11 w-11 rounded-lg object-cover" />
                        {i.productId ? (
                          <Link href={`/admin/products/${i.productId}`} className="font-medium hover:text-brand-600">{i.name}</Link>
                        ) : (
                          <span className="font-medium">{i.name} <span className="text-xs text-slate-400">(deleted)</span></span>
                        )}
                      </div>
                    </td>
                    <td>{fmt(i.price)}</td>
                    <td>{i.quantity}</td>
                    <td className="text-right font-semibold">{fmt(i.price * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="ml-auto max-w-xs space-y-2 p-5 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{fmt(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between text-emerald-600"><dt>Discount {order.couponCode && `(${order.couponCode})`}</dt><dd>−{fmt(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-slate-500">Shipping</dt><dd>{order.shipping ? fmt(order.shipping) : "Free"}</dd></div>
              {order.tax > 0 && <div className="flex justify-between"><dt className="text-slate-500">Tax</dt><dd>{fmt(order.tax)}</dd></div>}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><dt>Total</dt><dd>{fmt(order.total)}</dd></div>
            </dl>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="card p-5 text-sm">
              <h2 className="font-semibold">Customer</h2>
              <p className="mt-2 font-medium">{order.name}</p>
              <p className="text-slate-600">{order.email}</p>
              <p className="text-slate-600">{order.phone}</p>
              {order.user ? (
                <Link href={`/admin/customers/${order.user.id}`} className="mt-2 inline-block text-brand-600 hover:underline print:hidden">View customer profile →</Link>
              ) : (
                <p className="mt-2 text-xs text-slate-400">Guest checkout</p>
              )}
            </div>
            <div className="card p-5 text-sm">
              <h2 className="font-semibold">Shipping address</h2>
              <p className="mt-2 text-slate-600">{order.address}<br />{order.city}, {order.postalCode}<br />{order.country}</p>
              <p className="mt-3 font-semibold">Payment</p>
              <p className="text-slate-600">{order.paymentMethod === "COD" ? "Cash on delivery" : "Card"}</p>
            </div>
          </div>
        </div>

        <div className="card h-fit p-5 print:hidden">
          <h2 className="mb-4 font-semibold">Manage order</h2>
          <OrderUpdateForm order={order} />
        </div>
      </div>
    </div>
  );
}
