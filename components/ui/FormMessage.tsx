import { AlertCircle, CheckCircle2 } from "lucide-react";

export function FormMessage({ state }: { state?: { error?: string; success?: string } }) {
  if (!state?.error && !state?.success) return null;
  return state.error ? (
    <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
    </p>
  ) : (
    <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
      <CheckCircle2 className="h-4 w-4 shrink-0" /> {state.success}
    </p>
  );
}
