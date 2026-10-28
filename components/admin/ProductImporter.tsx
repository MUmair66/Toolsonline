"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { importProducts, type ImportRow } from "@/actions/admin";
import { parseCSV } from "@/lib/csv";
import { cn } from "@/lib/utils";

type Result = { created: number; updated: number; errors: string[] };

export function ProductImporter() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<"upsert" | "create">("upsert");
  const [result, setResult] = useState<Result | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => (text.trim() ? (parseCSV(text) as unknown as ImportRow[]) : []), [text]);
  const issues = rows.map((r) => {
    if (!r.name?.trim()) return "Missing name";
    if (r.price === undefined || r.price === "" || isNaN(Number(r.price)) || Number(r.price) < 0) return "Invalid price";
    return "";
  });
  const valid = issues.filter((i) => !i).length;
  const hasNameCol = rows.length > 0 && "name" in rows[0];

  const readFile = (f?: File | null) => {
    if (!f) return;
    setFileName(f.name);
    setResult(null);
    f.text().then(setText);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            readFile(e.dataTransfer.files[0]);
          }}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "card flex cursor-pointer flex-col items-center justify-center border-2 border-dashed px-6 py-12 text-center transition",
            dragging ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-brand-400"
          )}
        >
          <FileSpreadsheet className="h-12 w-12 text-brand-600" />
          <p className="mt-3 font-semibold">{fileName || "Drop a CSV file here, or click to browse"}</p>
          <p className="mt-1 text-sm text-slate-500">Excel / Google Sheets → File → Download as CSV</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => readFile(e.target.files?.[0])} />
        </div>

        <div className="card p-5">
          <label htmlFor="csv" className="label">…or paste CSV data</label>
          <textarea
            id="csv"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setResult(null);
            }}
            rows={6}
            className="input font-mono text-xs"
            placeholder={"name,price,stock,brand,category\nBosch GWS 750 Angle Grinder,8500,10,Bosch,Grinders"}
          />
        </div>

        {rows.length > 0 && (
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 p-5">
              <h2 className="font-semibold">Preview</h2>
              <p className="text-sm">
                <span className="font-semibold text-emerald-600">{valid} valid</span>
                {rows.length - valid > 0 && <span className="ml-2 font-semibold text-red-600">{rows.length - valid} with errors</span>}
                <span className="ml-2 text-slate-500">of {rows.length} rows</span>
              </p>
            </div>
            {!hasNameCol && (
              <p className="mx-5 mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                No &quot;name&quot; column found. Make sure the first row contains column headers.
              </p>
            )}
            <div className="max-h-96 overflow-auto">
              <table className="table-base">
                <thead className="sticky top-0">
                  <tr><th>#</th><th>Name</th><th>Price</th><th>Stock</th><th>SKU</th><th>Brand</th><th>Category</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {rows.slice(0, 200).map((r, i) => (
                    <tr key={i} className={issues[i] ? "bg-red-50/50" : ""}>
                      <td className="text-slate-400">{i + 2}</td>
                      <td className="max-w-56 truncate font-medium">{r.name}</td>
                      <td>{r.price}</td>
                      <td>{r.stock || "0"}</td>
                      <td className="text-slate-500">{r.sku}</td>
                      <td className="text-slate-500">{r.brand}</td>
                      <td className="text-slate-500">{r.category}</td>
                      <td>
                        {issues[i] ? (
                          <span className="badge bg-red-100 text-red-700">{issues[i]}</span>
                        ) : (
                          <span className="badge bg-emerald-100 text-emerald-700">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 200 && <p className="p-3 text-center text-xs text-slate-500">…and {rows.length - 200} more rows</p>}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="card space-y-4 p-5">
          <h2 className="font-semibold">Import options</h2>
          <div className="space-y-2">
            {[
              { v: "upsert" as const, t: "Create & update", d: "Update products with matching SKU (or name), create the rest" },
              { v: "create" as const, t: "Create only", d: "Always create new products, even if they already exist" },
            ].map((o) => (
              <label key={o.v} className={cn("flex cursor-pointer gap-3 rounded-lg border p-3", mode === o.v ? "border-brand-600 bg-brand-50" : "border-slate-200")}>
                <input type="radio" checked={mode === o.v} onChange={() => setMode(o.v)} className="mt-1 accent-brand-600" />
                <span>
                  <span className="block text-sm font-medium">{o.t}</span>
                  <span className="text-xs text-slate-500">{o.d}</span>
                </span>
              </label>
            ))}
          </div>
          <button
            disabled={!valid || pending}
            onClick={() =>
              start(async () => {
                const res = await importProducts(rows.filter((_, i) => !issues[i]), mode);
                setResult(res);
              })
            }
            className="btn-primary w-full !py-3"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {pending ? "Importing…" : `Import ${valid} product${valid === 1 ? "" : "s"}`}
          </button>
          {result && (
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> {result.created} created · {result.updated} updated
              </p>
              {result.errors.length > 0 && (
                <div className="text-red-700">
                  <p className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" /> {result.errors.length} errors</p>
                  <ul className="mt-1 max-h-32 list-disc overflow-y-auto pl-5 text-xs">{result.errors.map((e) => <li key={e}>{e}</li>)}</ul>
                </div>
              )}
              <Link href="/admin/products" className="inline-block font-semibold text-brand-600 hover:underline">View products →</Link>
            </div>
          )}
        </div>

        <div className="card p-5 text-sm">
          <h2 className="font-semibold">CSV format</h2>
          <p className="mt-2 text-slate-500">The first row must contain column headers. Only <b>name</b> and <b>price</b> are required.</p>
          <ul className="mt-3 space-y-1.5 text-slate-600">
            <li><code className="text-brand-700">name</code>, <code className="text-brand-700">price</code> — required</li>
            <li><code>description</code>, <code>comparePrice</code> (original price for sales)</li>
            <li><code>stock</code>, <code>sku</code> (used to match existing products)</li>
            <li><code>brand</code>, <code>category</code> — names; created automatically if new</li>
            <li><code>images</code> — URLs separated by <code>|</code></li>
            <li><code>featured</code>, <code>active</code> — true / false</li>
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            <a href="/api/admin/export/template" className="btn-secondary w-full" download><Download className="h-4 w-4" /> Download template</a>
            <a href="/api/admin/export/products" className="btn-ghost w-full" download>Export current catalog</a>
          </div>
        </div>
      </div>
    </div>
  );
}
