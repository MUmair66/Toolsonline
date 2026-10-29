"use client";

import { useActionState, useEffect, useRef } from "react";
import { Mail } from "lucide-react";
import { subscribe } from "@/actions/shop";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function Newsletter({ dark }: { dark?: boolean } = {}) {
  const [state, action] = useActionState(subscribe, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="w-full max-w-md">
      <div className="flex gap-2 rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-slate-200">
        <div className="relative flex-1">
          <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="email" type="email" required placeholder="Enter your email" className="h-full w-full rounded-xl py-2.5 pr-3 pl-9 text-sm focus:outline-none" aria-label="Email address" />
        </div>
        <SubmitButton pendingText="…" className="!rounded-xl">Subscribe</SubmitButton>
      </div>
      {state?.error && <p className={`mt-2 text-sm ${dark ? "text-red-300" : "text-red-600"}`}>{state.error}</p>}
      {state?.success && <p className={`mt-2 text-sm font-medium ${dark ? "text-emerald-300" : "text-emerald-700"}`}>{state.success}</p>}
    </form>
  );
}
