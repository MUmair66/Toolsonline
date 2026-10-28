export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatPrice(amount: number, currency = "USD") {
  // Rupee currencies are shown the local way: "Rs. 4,200" (no decimals unless there are paisa).
  if (currency === "PKR" || currency === "INR") {
    const whole = Math.round(amount * 100) % 100 === 0;
    return `Rs. ${amount.toLocaleString("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
  }
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseImages(images: string | null | undefined): string[] {
  if (!images) return [];
  try {
    const arr = JSON.parse(images);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string" && x) : [];
  } catch {
    return [];
  }
}

export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="#f1f5f9"/><g fill="#cbd5e1"><rect x="200" y="220" width="200" height="150" rx="12"/><circle cx="250" cy="270" r="18" fill="#f1f5f9"/><path d="M215 355l60-55 40 35 30-25 45 45z" fill="#f1f5f9"/></g></svg>`
  );

export const ORDER_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
export const PAYMENT_STATUSES = ["PENDING", "PAID", "REFUNDED"] as const;

export function statusColor(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-800";
    case "PROCESSING":
      return "bg-blue-100 text-blue-800";
    case "SHIPPED":
      return "bg-indigo-100 text-indigo-800";
    case "DELIVERED":
    case "PAID":
      return "bg-emerald-100 text-emerald-800";
    case "CANCELLED":
      return "bg-red-100 text-red-800";
    case "REFUNDED":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function generateOrderNumber() {
  const d = new Date();
  const datePart = `${d.getFullYear().toString().slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `ORD-${datePart}-${rand}`;
}
