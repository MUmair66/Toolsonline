"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  className,
  pendingText,
  variant = "primary",
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  variant?: "primary" | "danger" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        variant === "primary" && "btn-primary",
        variant === "danger" && "btn-danger",
        variant === "secondary" && "btn-secondary",
        className
      )}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
