"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, Printer, RotateCcw } from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { cn } from "@/lib/utils";

export type ReorderItem = { productId: string; slug: string; name: string; price: number; image: string; stock: number; quantity: number };

/** Adds every still-available item from a past order back into the cart. */
export function ReorderButton({ items, className, label = "Buy again" }: { items: ReorderItem[]; className?: string; label?: string }) {
  const cart = useCart();
  const toast = useToast();
  const router = useRouter();
  const available = items.filter((i) => i.stock > 0);
  return (
    <button
      disabled={!available.length}
      title={available.length ? undefined : "These items are no longer available"}
      onClick={() => {
        available.forEach(({ quantity, ...item }) => cart.add(item, Math.min(quantity, item.stock)));
        toast(`${available.length} item${available.length > 1 ? "s" : ""} added to your cart`);
        router.push("/cart");
      }}
      className={cn("btn-secondary", className)}
    >
      <RotateCcw className="h-4 w-4" /> {label}
    </button>
  );
}

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(code).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 font-mono text-sm font-bold transition",
        copied ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-brand-300 bg-white text-brand-700 hover:bg-brand-50"
      )}
    >
      {code} {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function PrintInvoice() {
  return (
    <button onClick={() => window.print()} className="btn-secondary print:hidden">
      <Printer className="h-4 w-4" /> Invoice
    </button>
  );
}
