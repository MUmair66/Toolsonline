"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveAutomations, saveBrand, saveCategory, saveCoupon, saveCustomer, saveSettings, saveTeamMember, updateOrder } from "@/actions/admin";
import { Wand2 } from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions";
import { useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/utils";
import { ImageUploader } from "./ImageUploader";

function Field({
  label,
  name,
  hint,
  className,
  ...props
}: { label: string; name: string; hint?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} className="input" {...props} />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/* ---------------- Category ---------------- */

export function CategoryForm({
  category,
}: {
  category?: { id: string; name: string; slug: string; description: string | null; image: string | null };
}) {
  const [state, action] = useActionState(saveCategory.bind(null, category?.id ?? null), undefined);
  return (
    <form action={action} className="card max-w-2xl space-y-4 p-6">
      <Field label="Name *" name="name" defaultValue={category?.name} required />
      <Field label="Slug" name="slug" defaultValue={category?.slug} placeholder="Auto-generated from name" />
      <div>
        <label htmlFor="description" className="label">Description</label>
        <textarea id="description" name="description" rows={3} defaultValue={category?.description ?? ""} className="input" />
      </div>
      <div>
        <span className="label">Cover image</span>
        <ImageUploader name="image" initial={category?.image ? [category.image] : []} multiple={false} />
      </div>
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton pendingText="Saving...">{category ? "Save changes" : "Create category"}</SubmitButton>
        <Link href="/admin/categories" className="btn-secondary">Cancel</Link>
      </div>
    </form>
  );
}

/* ---------------- Order status ---------------- */

export function OrderUpdateForm({
  order,
}: {
  order: { id: string; status: string; paymentStatus: string; notes: string | null };
}) {
  const [state, action] = useActionState(updateOrder.bind(null, order.id), undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="status" className="label">Order status</label>
        <select id="status" name="status" defaultValue={order.status} className="input">
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </select>
        <p className="mt-1 text-xs text-slate-500">Cancelling returns items to stock automatically.</p>
      </div>
      <div>
        <label htmlFor="paymentStatus" className="label">Payment status</label>
        <select id="paymentStatus" name="paymentStatus" defaultValue={order.paymentStatus} className="input">
          {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="notes" className="label">Notes</label>
        <textarea id="notes" name="notes" rows={3} defaultValue={order.notes ?? ""} className="input" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Updating...">Update order</SubmitButton>
    </form>
  );
}

/* ---------------- Customer ---------------- */

export function CustomerForm({
  customer,
}: {
  customer?: { id: string; name: string; email: string; phone: string | null; address: string | null; city: string | null; postalCode: string | null; country: string | null };
}) {
  const [state, action] = useActionState(saveCustomer.bind(null, customer?.id ?? null), undefined);
  return (
    <form action={action} className="card space-y-4 p-6">
      <Field label="Full name *" name="name" defaultValue={customer?.name} required />
      <Field label="Email *" name="email" type="email" defaultValue={customer?.email} required />
      <Field label="Phone" name="phone" defaultValue={customer?.phone ?? ""} />
      <Field label="Address" name="address" defaultValue={customer?.address ?? ""} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="City" name="city" defaultValue={customer?.city ?? ""} />
        <Field label="Postal code" name="postalCode" defaultValue={customer?.postalCode ?? ""} />
      </div>
      <Field label="Country" name="country" defaultValue={customer?.country ?? ""} />
      <Field
        label={customer ? "New password" : "Password *"}
        name="password"
        type="password"
        autoComplete="new-password"
        required={!customer}
        hint={customer ? "Leave blank to keep the current password." : "At least 6 characters."}
      />
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton pendingText="Saving...">{customer ? "Save changes" : "Create customer"}</SubmitButton>
        <Link href="/admin/customers" className="btn-secondary">Cancel</Link>
      </div>
    </form>
  );
}

/* ---------------- Coupon ---------------- */

export function CouponForm({
  coupon,
}: {
  coupon?: {
    id: string;
    code: string;
    type: string;
    value: number;
    minOrder: number;
    maxUses: number | null;
    expiresAt: Date | null;
    active: boolean;
  };
}) {
  const [state, action] = useActionState(saveCoupon.bind(null, coupon?.id ?? null), undefined);
  return (
    <form action={action} className="card grid max-w-2xl gap-4 p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="code" className="label">Coupon code *</label>
        <div className="flex gap-2">
          <input id="code" name="code" defaultValue={coupon?.code} required className="input font-mono uppercase" placeholder="e.g. SUMMER25" />
          <button
            type="button"
            className="btn-secondary whitespace-nowrap"
            onClick={(e) => {
              const input = (e.currentTarget.form!.elements.namedItem("code") as HTMLInputElement);
              const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
              input.value = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
            }}
          >
            <Wand2 className="h-4 w-4" /> Generate
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="type" className="label">Discount type</label>
        <select id="type" name="type" defaultValue={coupon?.type ?? "PERCENT"} className="input">
          <option value="PERCENT">Percentage (%)</option>
          <option value="FIXED">Fixed amount</option>
        </select>
      </div>
      <Field label="Value *" name="value" type="number" step="0.01" min="0" defaultValue={coupon?.value} required />
      <Field label="Minimum order" name="minOrder" type="number" step="0.01" min="0" defaultValue={coupon?.minOrder ?? 0} />
      <Field label="Usage limit" name="maxUses" type="number" min="1" defaultValue={coupon?.maxUses ?? ""} hint="Leave blank for unlimited" />
      <Field
        label="Expires on"
        name="expiresAt"
        type="date"
        defaultValue={coupon?.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 10) : ""}
        hint="Leave blank for no expiry"
      />
      <label className="flex cursor-pointer items-center gap-3 self-center pt-4">
        <input type="checkbox" name="active" defaultChecked={coupon?.active ?? true} className="h-4 w-4 accent-brand-600" />
        <span className="text-sm font-medium">Active</span>
      </label>
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <div className="flex gap-2 sm:col-span-2">
        <SubmitButton pendingText="Saving...">{coupon ? "Save changes" : "Create coupon"}</SubmitButton>
        <Link href="/admin/coupons" className="btn-secondary">Cancel</Link>
      </div>
    </form>
  );
}

/* ---------------- Settings ---------------- */

export function SettingsForm({
  s,
}: {
  s: {
    storeName: string;
    tagline: string;
    contactEmail: string;
    contactPhone: string;
    currency: string;
    shippingFee: number;
    freeShippingThreshold: number;
    taxRate: number;
    announcement: string | null;
  };
}) {
  const [state, action] = useActionState(saveSettings, undefined);
  return (
    <form action={action} className="max-w-3xl space-y-6">
      <section className="card grid gap-4 p-6 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Store details</h2>
        <Field label="Store name *" name="storeName" defaultValue={s.storeName} required />
        <Field label="Tagline" name="tagline" defaultValue={s.tagline} />
        <Field label="Contact email" name="contactEmail" type="email" defaultValue={s.contactEmail} />
        <Field label="Contact phone" name="contactPhone" defaultValue={s.contactPhone} />
        <Field
          label="Announcement bar"
          name="announcement"
          defaultValue={s.announcement ?? ""}
          className="sm:col-span-2"
          hint="Shown at the top of every store page. Leave blank to hide."
        />
      </section>
      <section className="card grid gap-4 p-6 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Checkout & pricing</h2>
        <Field label="Currency code" name="currency" defaultValue={s.currency} hint="ISO code, e.g. USD, EUR, GBP, PKR, INR" maxLength={3} />
        <Field label="Tax rate (%)" name="taxRate" type="number" step="0.01" min="0" defaultValue={s.taxRate} />
        <Field label="Flat shipping fee" name="shippingFee" type="number" step="0.01" min="0" defaultValue={s.shippingFee} />
        <Field
          label="Free shipping threshold"
          name="freeShippingThreshold"
          type="number"
          step="0.01"
          min="0"
          defaultValue={s.freeShippingThreshold}
          hint="Orders at or above this get free shipping. 0 disables."
        />
      </section>
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving...">Save settings</SubmitButton>
    </form>
  );
}

/* ---------------- Team member ---------------- */

export function TeamForm({
  member,
  canGrantAdmin,
  grantable,
}: {
  member?: { id: string; name: string; email: string; role: string; permissions: string[] };
  canGrantAdmin: boolean;
  grantable: string[];
}) {
  const [state, action] = useActionState(saveTeamMember.bind(null, member?.id ?? null), undefined);
  const [role, setRole] = useState(member?.role === "ADMIN" ? "ADMIN" : "STAFF");
  const [perms, setPerms] = useState<string[]>(member?.permissions ?? ["orders", "products"]);
  const options = PERMISSIONS.filter((p) => grantable.includes(p.key));

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-3">
      <div className="card space-y-4 p-6 xl:col-span-1">
        <h2 className="font-semibold">Account</h2>
        <Field label="Full name *" name="name" defaultValue={member?.name} required />
        <Field
          label="Email *"
          name="email"
          type="email"
          defaultValue={member?.email}
          required
          hint={member ? undefined : "If a customer already uses this email, they'll be upgraded to a team member."}
        />
        <Field
          label={member ? "New password" : "Password"}
          name="password"
          type="password"
          autoComplete="new-password"
          hint={member ? "Leave blank to keep the current password." : "Required for new accounts (6+ characters)."}
        />
      </div>

      <div className="card space-y-4 p-6 xl:col-span-2">
        <h2 className="font-semibold">Access level</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { v: "STAFF", t: "Staff", d: "Only the sections you choose below", show: true },
            { v: "ADMIN", t: "Super admin", d: "Full access to everything, including team management", show: canGrantAdmin },
          ]
            .filter((o) => o.show)
            .map((o) => (
              <label key={o.v} className={`flex cursor-pointer gap-3 rounded-xl border-2 p-4 ${role === o.v ? "border-brand-600 bg-brand-50" : "border-slate-200"}`}>
                <input type="radio" name="role" value={o.v} checked={role === o.v} onChange={() => setRole(o.v)} className="mt-1 accent-brand-600" />
                <span>
                  <span className="block font-semibold">{o.t}</span>
                  <span className="text-xs text-slate-500">{o.d}</span>
                </span>
              </label>
            ))}
        </div>

        {role === "STAFF" && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="label !mb-0">Permissions</span>
              <div className="flex gap-3 text-xs font-semibold">
                <button type="button" className="text-brand-600 hover:underline" onClick={() => setPerms(options.map((o) => o.key))}>Select all</button>
                <button type="button" className="text-slate-500 hover:underline" onClick={() => setPerms([])}>Clear</button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {options.map((p) => (
                <label key={p.key} className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${perms.includes(p.key) ? "border-brand-300 bg-brand-50/50" : "border-slate-200 hover:bg-slate-50"}`}>
                  <input
                    type="checkbox"
                    name="permissions"
                    value={p.key}
                    checked={perms.includes(p.key)}
                    onChange={(e) => setPerms((prev) => (e.target.checked ? [...prev, p.key] : prev.filter((x) => x !== p.key)))}
                    className="mt-0.5 h-4 w-4 accent-brand-600"
                  />
                  <span>
                    <span className="block text-sm font-medium">{p.label}</span>
                    <span className="text-xs text-slate-500">{p.desc}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">Every team member can see the dashboard overview.</p>
          </div>
        )}

        <FormMessage state={state} />
        <div className="flex gap-2">
          <SubmitButton pendingText="Saving...">{member ? "Save access" : "Add team member"}</SubmitButton>
          <Link href="/admin/team" className="btn-secondary">Cancel</Link>
        </div>
      </div>
    </form>
  );
}

/* ---------------- Automations ---------------- */

export function AutomationsForm({
  s,
}: {
  s: {
    autoHideOutOfStock: boolean;
    autoPaidOnDelivery: boolean;
    restockOnCancel: boolean;
    reviewModeration: boolean;
    lowStockThreshold: number;
    staleOrderDays: number;
  };
}) {
  const [state, action] = useActionState(saveAutomations, undefined);
  const toggles = [
    { name: "autoHideOutOfStock", on: s.autoHideOutOfStock, t: "Hide out-of-stock products", d: "Products with 0 stock disappear from the store automatically and come back when restocked." },
    { name: "autoPaidOnDelivery", on: s.autoPaidOnDelivery, t: "Mark cash orders as paid on delivery", d: "When an order is set to Delivered, its payment status becomes Paid." },
    { name: "restockOnCancel", on: s.restockOnCancel, t: "Restock items when an order is cancelled", d: "Cancelled order quantities are returned to inventory." },
    { name: "reviewModeration", on: s.reviewModeration, t: "Require approval for new reviews", d: "New reviews stay hidden until a team member approves them." },
  ];
  return (
    <form action={action} className="card space-y-1 p-6">
      <h2 className="mb-3 font-semibold">Rules (run automatically)</h2>
      {toggles.map((t) => (
        <label key={t.name} className="flex cursor-pointer items-start justify-between gap-6 rounded-lg p-3 hover:bg-slate-50">
          <span>
            <span className="block text-sm font-medium">{t.t}</span>
            <span className="text-xs text-slate-500">{t.d}</span>
          </span>
          <span className="relative mt-1 inline-flex shrink-0">
            <input type="checkbox" name={t.name} defaultChecked={t.on} className="peer sr-only" />
            <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40" />
            <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </span>
        </label>
      ))}
      <div className="grid gap-4 p-3 sm:grid-cols-2">
        <Field label="Low-stock alert threshold" name="lowStockThreshold" type="number" min="0" defaultValue={s.lowStockThreshold} hint="Products at or below this quantity are flagged." />
        <Field label="Stale order age (days)" name="staleOrderDays" type="number" min="1" defaultValue={s.staleOrderDays} hint='Used by "Cancel stale unpaid orders".' />
      </div>
      <div className="space-y-3 p-3">
        <FormMessage state={state} />
        <SubmitButton pendingText="Saving...">Save rules</SubmitButton>
      </div>
    </form>
  );
}

/* ---------------- Brand ---------------- */

export function BrandForm({
  brand,
}: {
  brand?: { id: string; name: string; slug: string; description: string | null; logo: string | null };
}) {
  const [state, action] = useActionState(saveBrand.bind(null, brand?.id ?? null), undefined);
  return (
    <form action={action} className="card max-w-2xl space-y-4 p-6">
      <Field label="Brand name *" name="name" defaultValue={brand?.name} required placeholder="e.g. Bosch" />
      <Field label="Slug" name="slug" defaultValue={brand?.slug} placeholder="Auto-generated from name" />
      <div>
        <label htmlFor="description" className="label">Description</label>
        <textarea id="description" name="description" rows={3} defaultValue={brand?.description ?? ""} className="input" />
      </div>
      <div>
        <span className="label">Logo</span>
        <ImageUploader name="logo" initial={brand?.logo ? [brand.logo] : []} multiple={false} />
      </div>
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton pendingText="Saving...">{brand ? "Save changes" : "Create brand"}</SubmitButton>
        <Link href="/admin/brands" className="btn-secondary">Cancel</Link>
      </div>
    </form>
  );
}
