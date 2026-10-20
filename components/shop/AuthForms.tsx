"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login, register } from "@/actions/auth";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

function PasswordInput({ name, id, autoComplete }: { name: string; id: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} name={name} type={show ? "text" : "password"} required className="input pr-10" autoComplete={autoComplete} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label htmlFor="email" className="label">Email address</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" placeholder="you@example.com" />
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <PasswordInput id="password" name="password" autoComplete="current-password" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full !py-3" pendingText="Signing in...">Sign in</SubmitButton>
      <p className="text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-600 hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action] = useActionState(register, undefined);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label htmlFor="name" className="label">Full name</label>
        <input id="name" name="name" required className="input" autoComplete="name" placeholder="Jane Doe" />
      </div>
      <div>
        <label htmlFor="email" className="label">Email address</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" placeholder="you@example.com" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="password" className="label">Password</label>
          <PasswordInput id="password" name="password" autoComplete="new-password" />
        </div>
        <div>
          <label htmlFor="confirm" className="label">Confirm password</label>
          <PasswordInput id="confirm" name="confirm" autoComplete="new-password" />
        </div>
      </div>
      <p className="text-xs text-slate-500">At least 6 characters.</p>
      <FormMessage state={state} />
      <SubmitButton className="w-full !py-3" pendingText="Creating account...">Create account</SubmitButton>
      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
