"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, Banknote, CreditCard, Loader2, Lock, Tag, X } from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { usePrice, useStore } from "@/components/providers/StoreProvider";
import { SafeImage } from "@/components/ui/SafeImage";
import { applyCoupon, placeOrder } from "@/actions/shop";
import { cn } from "@/lib/utils";

type Address = { name: string; email: string; phone: string; address: string; city: string; postalCode: string; country: string };

type SavedAddress = { id: string; label: string; name: string; phone: string; address: string; city: string; postalCode: string; country: string; isDefault: boolean };

export function CheckoutForm({ user, addresses = [] }: { user: Address | null; addresses?: SavedAddress[] }) {
  const [selected, setSelected] = useState<string>(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "");
  const [saveAddr, setSaveAddr] = useState(true);
  const sel = addresses.find((a) => a.id === selected);
  const pre = sel ? { ...user, ...sel, email: user?.email } : user;
  const cart = useCart();
  const store = useStore();
  const fmt = usePrice();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [payment, setPayment] = useState<"COD" | "CARD">("COD");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  if (!cart.ready) return <div className="mt-10 h-96 animate-pulse rounded-2xl bg-slate-100" />;

  if (!cart.items.length) {
    return (
      <div className="card mt-8 px-6 py-16 text-center">
        <p className="text-lg font-semibold">Your cart is empty</p>
        <Link href="/products" className="btn-primary mt-4">
          Browse products
        </Link>
      </div>
    );
  }

  const discount = coupon ? Math.min(coupon.discount, cart.subtotal) : 0;
  const afterDiscount = cart.subtotal - discount;
  const shipping = store.freeShippingThreshold > 0 && afterDiscount >= store.freeShippingThreshold ? 0 : store.shippingFee;
  const tax = Math.round(afterDiscount * (store.taxRate / 100) * 100) / 100;
  const total = afterDiscount + shipping + tax;

  async function onApplyCoupon() {
    setCouponError("");
    setCouponLoading(true);
    const res = await applyCoupon(couponInput, cart.subtotal);
    setCouponLoading(false);
    if (res.ok) {
      setCoupon({ code: res.code, discount: res.discount });
      setCouponInput("");
    } else setCouponError(res.error);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) || "");
    startTransition(async () => {
      const res = await placeOrder({
        items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        name: get("name"),
        email: get("email"),
        phone: get("phone"),
        address: get("address"),
        city: get("city"),
        postalCode: get("postalCode"),
        country: get("country"),
        notes: get("notes"),
        paymentMethod: payment,
        couponCode: coupon?.code,
        saveAddress: !!user && !sel && saveAddr,
      });
      if (res.ok) {
        cart.clear();
        router.push(`/order-success/${res.orderNumber}`);
      } else {
        setError(res.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-8 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        {error && (
          <p className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </p>
        )}
        {!user && (
          <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
            Already have an account?{" "}
            <Link href="/login?next=/checkout" className="font-semibold underline">
              Log in
            </Link>{" "}
            for faster checkout and order tracking.
          </p>
        )}

        {addresses.length > 0 && (
          <section className="card p-6">
            <h2 className="text-lg font-semibold">Ship to a saved address</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {addresses.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  onClick={() => setSelected(a.id)}
                  className={cn("rounded-xl border-2 p-4 text-left text-sm transition", selected === a.id ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:border-slate-300")}
                >
                  <span className="flex items-center justify-between">
                    <span className="font-semibold">{a.label}</span>
                    {a.isDefault && <span className="badge bg-slate-900 text-white">Default</span>}
                  </span>
                  <span className="mt-1 block text-slate-600">{a.name}</span>
                  <span className="block text-slate-500">{a.address}, {a.city}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelected("")}
                className={cn("rounded-xl border-2 border-dashed p-4 text-left text-sm font-semibold transition", !selected ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-500 hover:border-slate-400")}
              >
                + Use a different address
              </button>
            </div>
          </section>
        )}

        {/* Remount on address change so the fields pick up the new defaults. */}
        <div key={selected || "new"} className="space-y-6">
          <section className="card p-6">
            <h2 className="text-lg font-semibold">Contact information</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" name="name" defaultValue={pre?.name} autoComplete="name" className="sm:col-span-2" />
              <Field label="Email" name="email" type="email" defaultValue={pre?.email} autoComplete="email" />
              <Field label="Phone" name="phone" type="tel" defaultValue={pre?.phone ?? ""} autoComplete="tel" />
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-semibold">Shipping address</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Street address" name="address" defaultValue={pre?.address ?? ""} autoComplete="street-address" className="sm:col-span-2" />
              <Field label="City" name="city" defaultValue={pre?.city ?? ""} autoComplete="address-level2" />
              <Field label="Postal code" name="postalCode" defaultValue={pre?.postalCode ?? ""} autoComplete="postal-code" />
              <Field label="Country" name="country" defaultValue={pre?.country ?? ""} autoComplete="country-name" className="sm:col-span-2" />
              <div className="sm:col-span-2">
                <label className="label" htmlFor="notes">
                  Order notes <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea id="notes" name="notes" rows={3} className="input" placeholder="Delivery instructions, gift message..." />
              </div>
              {user && !sel && (
                <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
                  <input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} className="h-4 w-4 accent-brand-600" />
                  Save this address to my account for next time
                </label>
              )}
            </div>
          </section>
        </div>

        <section className="card p-6">
          <h2 className="text-lg font-semibold">Payment method</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { id: "COD" as const, icon: Banknote, title: "Cash on delivery", desc: "Pay when your order arrives" },
              { id: "CARD" as const, icon: CreditCard, title: "Credit / Debit card", desc: "Visa, Mastercard, Amex" },
            ].map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setPayment(m.id)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border-2 p-4 text-left transition",
                  payment === m.id ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:border-slate-300"
                )}
              >
                <m.icon className={cn("mt-0.5 h-5 w-5", payment === m.id ? "text-brand-600" : "text-slate-400")} />
                <div>
                  <p className="font-semibold">{m.title}</p>
                  <p className="text-xs text-slate-500">{m.desc}</p>
                </div>
              </button>
            ))}
          </div>
          {payment === "CARD" && (
            <div className="mt-4 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
              <p className="text-xs text-slate-500 sm:col-span-2">
                Demo mode — no real charge is made. Enter any test card details. Connect a payment provider (e.g. Stripe) for live payments.
              </p>
              <Field label="Card number" name="card" placeholder="4242 4242 4242 4242" className="sm:col-span-2" inputMode="numeric" />
              <Field label="Expiry" name="exp" placeholder="MM/YY" />
              <Field label="CVC" name="cvc" placeholder="123" inputMode="numeric" />
            </div>
          )}
        </section>
      </div>

      <div className="lg:col-span-2">
        <div className="card sticky top-24 p-6">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <ul className="mt-4 max-h-72 divide-y divide-slate-100 overflow-y-auto">
            {cart.items.map((i) => (
              <li key={i.productId} className="flex items-center gap-3 py-3">
                <div className="relative h-14 w-14 shrink-0">
                  <SafeImage src={i.image} alt={i.name} className="h-full w-full rounded-lg object-cover" />
                  <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-700 px-1 text-[10px] font-bold text-white">
                    {i.quantity}
                  </span>
                </div>
                <p className="line-clamp-2 flex-1 text-sm font-medium">{i.name}</p>
                <p className="text-sm font-semibold">{fmt(i.price * i.quantity)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-slate-200 pt-4">
            {coupon ? (
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm">
                <span className="flex items-center gap-2 font-semibold text-emerald-700">
                  <Tag className="h-4 w-4" /> {coupon.code}
                </span>
                <button type="button" onClick={() => setCoupon(null)} className="text-emerald-700 hover:text-emerald-900" aria-label="Remove coupon">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onApplyCoupon();
                      }
                    }}
                    placeholder="Coupon code"
                    className="input !py-2 uppercase"
                    aria-label="Coupon code"
                  />
                  <button type="button" onClick={onApplyCoupon} disabled={couponLoading || !couponInput} className="btn-secondary !py-2">
                    {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                  </button>
                </div>
                {couponError && <p className="mt-2 text-xs text-red-600">{couponError}</p>}
              </div>
            )}
          </div>

          <dl className="mt-4 space-y-2.5 text-sm">
            <Row label="Subtotal" value={fmt(cart.subtotal)} />
            {discount > 0 && <Row label="Discount" value={`−${fmt(discount)}`} className="text-emerald-600" />}
            <Row label="Shipping" value={shipping === 0 ? "Free" : fmt(shipping)} />
            {store.taxRate > 0 && <Row label={`Tax (${store.taxRate}%)`} value={fmt(tax)} />}
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-extrabold">{fmt(total)}</dd>
            </div>
          </dl>

          <button type="submit" disabled={pending} className="btn-primary mt-6 w-full !py-3 !text-base">
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-4 w-4" />}
            {pending ? "Placing order..." : `Place order · ${fmt(total)}`}
          </button>
          <p className="mt-3 text-center text-xs text-slate-400">By placing your order you agree to our terms & conditions.</p>
        </div>
      </div>
    </form>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex justify-between", className)}>
      <dt className={className ? "" : "text-slate-500"}>{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Field({
  label,
  name,
  className,
  ...props
}: { label: string; name: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input id={name} name={name} required className="input" {...props} />
    </div>
  );
}
