"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";

/** Runs a (bound) server action after an optional confirm() prompt. */
export function ConfirmButton({
  action,
  message,
  children,
  className,
  title,
}: {
  action: () => Promise<unknown>;
  message?: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      title={title}
      disabled={pending}
      className={className}
      onClick={() => {
        if (message && !window.confirm(message)) return;
        start(async () => {
          await action();
        });
      }}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}
