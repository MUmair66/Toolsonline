// Tiny RFC-4180-ish CSV helpers (shared client + server).

export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/^﻿/, "");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ""));
  if (nonEmpty.length < 2) return [];
  const headers = nonEmpty[0].map((h) => h.trim().toLowerCase().replace(/[\s_-]+/g, ""));
  return nonEmpty.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()])));
}

function esc(v: unknown) {
  const s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(headers: string[], rows: unknown[][]) {
  return "﻿" + [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
}

export const PRODUCT_CSV_HEADERS = ["name", "description", "price", "comparePrice", "stock", "sku", "category", "images", "featured", "active"];

export const PRODUCT_CSV_TEMPLATE = toCSV(PRODUCT_CSV_HEADERS, [
  ["Wireless Mouse", "Ergonomic wireless mouse with silent clicks", "29.99", "39.99", "100", "MOUSE-01", "Electronics", "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800", "true", "true"],
  ["Cotton Socks (3 pack)", "Soft breathable everyday socks", "12.50", "", "250", "SOCK-3P", "Fashion", "", "false", "true"],
]);
