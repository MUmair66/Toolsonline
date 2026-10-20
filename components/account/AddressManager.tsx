"use client";

import { useActionState, useEffect, useState } from "react";
import { Briefcase, Home, MapPin, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { deleteAddress, saveAddress, setDefaultAddress } from "@/actions/account";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { cn } from "@/lib/utils";

export type Addr = {
  id: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

const ICONS: Record<string, typeof Home> = { Home, Work: Briefcase, Other: MapPin };

function AddressForm({ addr, defaults, onDone }: { addr?: Addr; defaults: { name: string; phone: string }; onDone: () => void }) {
  const [state, action] = useActionState(saveAddress.bind(null, addr?.id ?? null), undefined);
  const [label, setLabel] = useState(addr?.label ?? "Home");
  useEffect(() => {
    if (state?.success) onDone();
  }, [state, onDone]);

  const field = (name: keyof Addr, title: string, cls = "", props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className={cls}>
      <label htmlFor={`a-${name}`} className="label">{title}</label>
      <input id={`a-${name}`} name={name} required defaultValue={(addr?.[name] as string) ?? (name === "name" ? defaults.name : name === "phone" ? defaults.phone : "")} className="input" {...props} />
    </div>
  );

  return (
    <form action={action} className="card animate-in grid gap-4 p-6 sm:grid-cols-2">
      <div className="flex items-center justify-between sm:col-span-2">
        <h2 className="font-semibold">{addr ? "Edit address" : "Add a new address"}</h2>
        <button type="button" onClick={onDone} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="sm:col-span-2">
        <span className="label">Label</span>
        <div className="flex gap-2">
          {["Home", "Work", "Other"].map((l) => {
            const Icon = ICONS[l];
            return (
              <label key={l} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition", label === l ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 hover:bg-slate-50")}>
                <input type="radio" name="label" value={l} checked={label === l} onChange={() => setLabel(l)} className="sr-only" />
                <Icon className="h-4 w-4" /> {l}
              </label>
            );
          })}
        </div>
      </div>
      {field("name", "Full name")}
      {field("phone", "Phone", "", { type: "tel" })}
      {field("address", "Street address", "sm:col-span-2")}
      {field("city", "City")}
      {field("postalCode", "Postal code")}
      {field("country", "Country", "sm:col-span-2")}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="isDefault" defaultChecked={addr?.isDefault} className="h-4 w-4 accent-brand-600" /> Use as my default address
      </label>
      <div className="sm:col-span-2"><FormMessage state={state?.error ? state : undefined} /></div>
      <div className="flex gap-2 sm:col-span-2">
        <SubmitButton pendingText="Saving…">{addr ? "Save changes" : "Save address"}</SubmitButton>
        <button type="button" onClick={onDone} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

export function AddressManager({ addresses, defaults }: { addresses: Addr[]; defaults: { name: string; phone: string } }) {
  const [editing, setEditing] = useState<Addr | "new" | null>(addresses.length ? null : "new");
  const close = () => setEditing(null);

  return (
    <div className="space-y-6">
      {editing && <AddressForm key={editing === "new" ? "new" : editing.id} addr={editing === "new" ? undefined : editing} defaults={defaults} onDone={close} />}

      <div className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) => {
          const Icon = ICONS[a.label] ?? MapPin;
          return (
            <div key={a.id} className={cn("card relative p-5 transition", a.isDefault && "ring-2 ring-brand-500")}>
              <div className="flex items-start justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100"><Icon className="h-4 w-4 text-slate-600" /></span>
                  {a.label}
                </span>
                {a.isDefault && <span className="badge bg-brand-600 text-white">Default</span>}
              </div>
              <p className="mt-4 font-semibold">{a.name}</p>
              <p className="text-sm text-slate-600">{a.address}</p>
              <p className="text-sm text-slate-600">{a.city}, {a.postalCode} · {a.country}</p>
              <p className="mt-1 text-sm text-slate-500">{a.phone}</p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <button onClick={() => setEditing(a)} className="btn-secondary !px-3 !py-1.5 !text-xs"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                {!a.isDefault && (
                  <ConfirmButton action={setDefaultAddress.bind(null, a.id)} className="btn-secondary !px-3 !py-1.5 !text-xs">
                    <Star className="h-3.5 w-3.5" /> Set as default
                  </ConfirmButton>
                )}
                <ConfirmButton action={deleteAddress.bind(null, a.id)} message="Delete this address?" className="btn-ghost !px-3 !py-1.5 !text-xs text-red-600 hover:!bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </ConfirmButton>
              </div>
            </div>
          );
        })}
        {!editing && (
          <button
            onClick={() => setEditing("new")}
            className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 transition hover:border-brand-500 hover:bg-brand-50/40 hover:text-brand-700"
          >
            <Plus className="h-7 w-7" />
            <span className="font-semibold">Add new address</span>
          </button>
        )}
      </div>
    </div>
  );
}
