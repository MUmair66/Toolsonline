import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard, MapPin, MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { cn, formatPrice, parseImages, statusColor } from "@/lib/utils";
import { SafeImage } from "@/components/ui/SafeImage";
import { cancelMyOrder } from "@/actions/shop";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { OrderProgress } from "@/components/account/OrderProgress";
import { PrintInvoice, ReorderButton } from "@/components/account/AccountWidgets";

export const metadata = { title: "Order details" };

export default async function MyOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [order, settings] = await Promise.all([
    db.order.findFirst({
      where: { id, userId: user.id },
      include: { items: { include: { product: { select: { id: true, slug: true, price: true, stock: true, images: true, active: true } } } } },
    }),
    getSettings(),
  ]);
  if (!order) notFound();
  const fmt = (n: number) => formatPrice(n, settings.currency);
  const reorder = order.items
    .filter((i) => i.product?.active)
    .map((i) => ({
      productId: i.product!.id,
      slug: i.product!.slug,
      name: i.name,
      price: i.product!.price,
      image: parseImages(i.product!.images)[0] ?? i.image ?? "",
      stock: i.product!.stock,
      quantity: i.quantity,
    }));

  return (
    <div className="space-y-6">
      <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline print:hidden">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Order <span className="font-mono">{order.orderNumber}</span></h1>
            <span className={cn("badge capitalize", statusColor(order.status))}>{order.status.toLowerCase()}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Placed {new Date(order.createdAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <PrintInvoice />
          <ReorderButton items={reorder} />
          {order.status === "PENDING" && (
            <ConfirmButton action={cancelMyOrder.bind(null, order.id)} message="Cancel this order?" className="btn-danger">
              Cancel order
            </ConfirmButton>
          )}
        </div>
      </div>

      <div className="card p-6 print:hidden">
        <OrderProgress status={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-semibold">Items ({order.items.length})</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center gap-4 py-3">
                <SafeImage src={i.image} alt={i.name} className="h-16 w-16 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  {i.product ? (
                    <Link href={`/products/${i.product.slug}`} className="font-medium hover:text-brand-600">{i.name}</Link>
                  ) : (
                    <p className="font-medium">{i.name}</p>
                  )}
                  <p className="text-sm text-slate-500">{fmt(i.price)} × {i.quantity}</p>
                  {i.product && order.status === "DELIVERED" && (
                    <Link href={`/products/${i.product.slug}#reviews`} className="text-xs font-semibold text-brand-600 hover:underline print:hidden">
                      Write a review
                    </Link>
                  )}
                </div>
                <p className="font-semibold">{fmt(i.price * i.quantity)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{fmt(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-emerald-600"><dt>Discount {order.couponCode && `(${order.couponCode})`}</dt><dd>−{fmt(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-slate-500">Shipping</dt><dd>{order.shipping ? fmt(order.shipping) : "Free"}</dd></div>
            {order.tax > 0 && <div className="flex justify-between"><dt className="text-slate-500">Tax</dt><dd>{fmt(order.tax)}</dd></div>}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><dt>Total</dt><dd>{fmt(order.total)}</dd></div>
          </dl>
        </div>

        <div className="space-y-6">
          <div className="card p-6 text-sm">
            <h2 className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-brand-600" /> Shipping address</h2>
            <p className="mt-3 text-slate-600">{order.name}<br />{order.address}<br />{order.city}, {order.postalCode}<br />{order.country}<br />{order.phone}</p>
          </div>
          <div className="card p-6 text-sm">
            <h2 className="flex items-center gap-2 font-semibold"><CreditCard className="h-4 w-4 text-brand-600" /> Payment</h2>
            <p className="mt-3 text-slate-600">{order.paymentMethod === "COD" ? "Cash on delivery" : "Credit / debit card"}</p>
            <span className={cn("badge mt-2 capitalize", statusColor(order.paymentStatus))}>{order.paymentStatus.toLowerCase()}</span>
          </div>
          <Link href={`/contact?order=${order.orderNumber}`} className="card flex items-center gap-3 p-5 text-sm transition hover:shadow-md print:hidden">
            <MessageCircle className="h-5 w-5 text-brand-600" />
            <span>
              <span className="block font-semibold">Problem with this order?</span>
              <span className="text-slate-500">Contact support</span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
