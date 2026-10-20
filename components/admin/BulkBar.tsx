"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckSquare, Loader2 } from "lucide-react";
import { FormMessage } from "@/components/ui/FormMessage";
import type { FormState } from "@/actions/auth";

export type BulkOp = {
  value: string;
  label: string;
  danger?: boolean;
  input?: { type: "number"; placeholder: string } | { type: "select"; options: { value: string; label: string }[] };
};

export function SelectAll({ form }: { form: string }) {
  return (
    <input
      type="checkbox"
      className="h-4 w-4 accent-brand-600"
      aria-label="Select all"
      onChange={(e) => {
        document.querySelectorAll<HTMLInputElement>(`input[type=checkbox][name=ids][form="${form}"]`).forEach((cb) => (cb.checked = e.target.checked));
        document.dispatchEvent(new Event("bulk-change"));
      }}
    />
  );
}

/** Row checkbox that belongs to a bulk form rendered elsewhere on the page. */
export function RowCheck({ form, value, label }: { form: string; value: string; label: string }) {
  return (
    <input
      type="checkbox"
      name="ids"
      value={value}
      form={form}
      className="h-4 w-4 accent-brand-600"
      aria-label={label}
      onChange={() => document.dispatchEvent(new Event("bulk-change"))}
    />
  );
}

function Apply({ danger }: { danger: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={danger ? "btn-danger !py-2" : "btn-primary !py-2"} disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />} Apply
    </button>
  );
}

export function BulkForm({
  id,
  action,
  ops,
  noun = "item",
}: {
  id: string;
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  ops: BulkOp[];
  noun?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [op, setOp] = useState("");
  const [count, setCount] = useState(0);
  const current = ops.find((o) => o.value === op);

  useEffect(() => {
    const recount = () => setCount(document.querySelectorAll(`input[name=ids][form="${id}"]:checked`).length);
    document.addEventListener("bulk-change", recount);
    recount();
    return () => document.removeEventListener("bulk-change", recount);
  }, [id]);

  // After a successful bulk action, clear selections (rows may have been deleted or changed).
  useEffect(() => {
    if (state?.success) {
      document.querySelectorAll<HTMLInputElement>(`input[type=checkbox]`).forEach((cb) => (cb.checked = false));
      setCount(0);
      setOp("");
    }
  }, [state]);

  return (
    <form
      id={id}
      action={formAction}
      onSubmit={(e) => {
        if (!count) {
          e.preventDefault();
          alert(`Select at least one ${noun} first.`);
          return;
        }
        if (current?.danger && !confirm(`${current.label}: ${count} ${noun}(s)? This cannot be undone.`)) e.preventDefault();
      }}
      className="mb-3"
    >
      <div className={`flex flex-wrap items-center gap-2 rounded-xl border p-2 transition ${count ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-white"}`}>
        <span className="flex items-center gap-1.5 px-2 text-sm font-medium text-slate-600">
          <CheckSquare className="h-4 w-4" /> {count} selected
        </span>
        <select name="op" value={op} onChange={(e) => setOp(e.target.value)} className="input !w-auto !py-2" aria-label="Bulk action" required>
          <option value="" disabled>Choose bulk action…</option>
          {ops.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {current?.input?.type === "number" && (
          <input name="value" type="number" step="any" required placeholder={current.input.placeholder} className="input !w-40 !py-2" />
        )}
        {current?.input?.type === "select" && (
          <select name="value" className="input !w-auto !py-2" defaultValue="">
            {current.input.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
        <Apply danger={!!current?.danger} />
      </div>
      {state && <div className="mt-2"><FormMessage state={state} /></div>}
    </form>
  );
}
