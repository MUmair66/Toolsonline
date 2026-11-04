"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { importProducts, uploadImage, type ImportRow } from "@/actions/admin";
import { shrink } from "@/components/admin/ImageUploader";
import { parseCSV } from "@/lib/csv";
import { cn, slugify } from "@/lib/utils";

type Result = { created: number; updated: number; errors: string[] };
type RowImages = { refs: (string | File)[]; missing: string[] };

const isUrl = (s: string) => /^(https?:)?\/\//i.test(s) || s.startsWith("/");
const baseKey = (fileName: string) => slugify(fileName.replace(/\.[^./\\]+$/, ""));

/**
 * Works out which images belong to a row:
 * - `images` column: URLs are kept; anything else is treated as a file name from the dropped images.
 * - no `images` value: files named after the SKU or product name are used automatically
 *   (e.g. "GWS-750.jpg", "GWS-750-2.jpg", "Bosch GWS 750 (3).png").
 */
function matchImages(row: ImportRow, byName: Map<string, File>, byBase: Map<string, File>): RowImages {
  const refs: (string | File)[] = [];
  const missing: string[] = [];
  const tokens = (row.images || "").split(/[|;]/).map((s) => s.trim()).filter(Boolean);

  if (tokens.length) {
    for (const t of tokens) {
      if (isUrl(t)) refs.push(t);
      else {
        const f = byName.get(t.toLowerCase()) ?? byBase.get(baseKey(t));
        if (f) refs.push(f);
        else missing.push(t);
      }
    }
    return { refs, missing };
  }

  if (!byBase.size) return { refs, missing };
  for (const key of [row.sku, row.name].map((v) => slugify(v || "")).filter(Boolean)) {
    const first = byBase.get(key);
    if (first) refs.push(first);
    for (let n = 1; n <= 12; n++) {
      const extra = byBase.get(`${key}-${n}`);
      if (extra && !refs.includes(extra)) refs.push(extra);
    }
    if (refs.length) break; // SKU match wins over name match
  }
  return { refs, missing };
}

export function ProductImporter() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<"upsert" | "create">("upsert");
  const [result, setResult] = useState<Result | null>(null);
  const [progress, setProgress] = useState("");
  const [dragging, setDragging] = useState<"" | "csv" | "img">("");
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => (text.trim() ? (parseCSV(text) as unknown as ImportRow[]) : []), [text]);
  const issues = rows.map((r) => {
    if (!r.name?.trim()) return "Missing name";
    if (r.price === undefined || r.price === "" || isNaN(Number(r.price)) || Number(r.price) < 0) return "Invalid price";
    return "";
  });
  const valid = issues.filter((i) => !i).length;
  const hasNameCol = rows.length > 0 && "name" in rows[0];

  const matches = useMemo(() => {
    const byName = new Map(files.map((f) => [f.name.toLowerCase(), f]));
    const byBase = new Map(files.map((f) => [baseKey(f.name), f]));
    return rows.map((r) => matchImages(r, byName, byBase));
  }, [rows, files]);
  const usedFiles = useMemo(() => new Set(matches.flatMap((m) => m.refs.filter((x): x is File => x instanceof File))), [matches]);
  const unusedFiles = files.filter((f) => !usedFiles.has(f));
  const missingCount = matches.reduce((n, m) => n + m.missing.length, 0);

  const readFile = (f?: File | null) => {
    if (!f) return;
    setFileName(f.name);
    setResult(null);
    f.text().then(setText);
  };

  const addImages = (list?: FileList | null) => {
    if (!list?.length) return;
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setResult(null);
    setFiles((prev) => {
      const names = new Set(incoming.map((f) => f.name.toLowerCase()));
      return [...prev.filter((f) => !names.has(f.name.toLowerCase())), ...incoming];
    });
    if (imgRef.current) imgRef.current.value = "";
  };

  async function runImport() {
    const errors: string[] = [];
    const urlOf = new Map<File, string>();
    const toUpload = [...usedFiles];

    // Upload matched images first (3 at a time), then import rows with their final URLs.
    let done = 0;
    const queue = [...toUpload];
    setProgress(toUpload.length ? `Uploading images 0/${toUpload.length}…` : "");
    await Promise.all(
      Array.from({ length: Math.min(3, queue.length) }, async () => {
        for (let f = queue.shift(); f; f = queue.shift()) {
          const fd = new FormData();
          fd.append("file", await shrink(f));
          const res = await uploadImage(fd).catch(() => ({ url: undefined, error: "Upload failed" }));
          if (res.url) urlOf.set(f, res.url);
          else errors.push(`Image "${f.name}": ${res.error || "upload failed"}`);
          setProgress(`Uploading images ${++done}/${toUpload.length}…`);
        }
      })
    );

    const payload: ImportRow[] = [];
    rows.forEach((r, i) => {
      if (issues[i]) return;
      const m = matches[i];
      const urls = m.refs.map((x) => (x instanceof File ? urlOf.get(x) : x)).filter((u): u is string => !!u);
      payload.push({ ...r, images: urls.join("|") });
    });

    setProgress(`Importing ${payload.length} products…`);
    const res = await importProducts(payload, mode);
    setProgress("");
    setResult({ ...res, errors: [...errors, ...res.errors] });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging("csv");
          }}
          onDragLeave={() => setDragging("")}
          onDrop={(e) => {
            e.preventDefault();
            setDragging("");
            readFile(e.dataTransfer.files[0]);
          }}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "card flex cursor-pointer flex-col items-center justify-center border-2 border-dashed px-6 py-10 text-center transition",
            dragging === "csv" ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-brand-400"
          )}
        >
          <FileSpreadsheet className="h-10 w-10 text-brand-600" />
          <p className="mt-3 font-semibold">{fileName || "1. Drop a CSV file here, or click to browse"}</p>
          <p className="mt-1 text-sm text-slate-500">Excel / Google Sheets → File → Download as CSV</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => readFile(e.target.files?.[0])} />
        </div>

        {/* Product images */}
        <div className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold">2. Product images <span className="font-normal text-slate-400">(optional)</span></h2>
              <p className="mt-1 text-sm text-slate-500">
                Select all photos at once. Name each file after the product&apos;s <b>SKU</b> or <b>name</b> (e.g. <code>GWS-750.jpg</code>, <code>GWS-750-2.jpg</code>), or list the file names in the CSV <code>images</code> column.
              </p>
            </div>
            {files.length > 0 && (
              <button type="button" onClick={() => setFiles([])} className="btn-ghost !px-2 !py-1 text-xs">
                Clear all
              </button>
            )}
          </div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging("img");
            }}
            onDragLeave={() => setDragging("")}
            onDrop={(e) => {
              e.preventDefault();
              setDragging("");
              addImages(e.dataTransfer.files);
            }}
            onClick={() => imgRef.current?.click()}
            className={cn(
              "mt-4 flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-6 text-sm transition",
              dragging === "img" ? "border-brand-500 bg-brand-50" : "border-slate-300 text-slate-600 hover:border-brand-400"
            )}
          >
            <ImagePlus className="h-6 w-6 text-brand-600" />
            {files.length ? `${files.length} images selected · ${usedFiles.size} matched — click to add more` : "Drop images here, or click to choose"}
          </div>
          <input ref={imgRef} type="file" accept="image/*" multiple hidden onChange={(e) => addImages(e.target.files)} />

          {files.length > 0 && (
            <ul className="mt-3 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
              {files.map((f) => (
                <li
                  key={f.name}
                  className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-xs", usedFiles.has(f) ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}
                  title={usedFiles.has(f) ? "Matched to a product" : "Not matched to any row"}
                >
                  {f.name}
                  <button type="button" onClick={() => setFiles((p) => p.filter((x) => x !== f))} aria-label={`Remove ${f.name}`} className="hover:text-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {rows.length > 0 && (unusedFiles.length > 0 || missingCount > 0) && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {unusedFiles.length > 0 && <>{unusedFiles.length} image{unusedFiles.length === 1 ? "" : "s"} not matched to any product (shown in amber). </>}
              {missingCount > 0 && <>{missingCount} file name{missingCount === 1 ? "" : "s"} in the CSV were not found among the selected images.</>}
            </p>
          )}
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
            rows={5}
            className="input font-mono text-xs"
            placeholder={"name,price,stock,sku,brand,category,images\nBosch GWS 750 Angle Grinder,8500,10,GWS-750,Bosch,Grinders,gws-750.jpg|gws-750-side.jpg"}
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
                  <tr><th>#</th><th>Image</th><th>Name</th><th>Price</th><th>Stock</th><th>SKU</th><th>Brand</th><th>Category</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {rows.slice(0, 200).map((r, i) => {
                    const m = matches[i];
                    return (
                      <tr key={i} className={issues[i] ? "bg-red-50/50" : ""}>
                        <td className="text-slate-400">{i + 2}</td>
                        <td>
                          <RowThumb refs={m.refs} />
                          {m.missing.length > 0 && <span className="block text-[11px] text-amber-700" title={m.missing.join(", ")}>{m.missing.length} missing</span>}
                        </td>
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
                    );
                  })}
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
              { v: "upsert" as const, t: "Create & update", d: "Update products with matching SKU (or name), create the rest. Existing images are kept when a row has none." },
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
          <button disabled={!valid || pending} onClick={() => start(runImport)} className="btn-primary w-full !py-3">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {pending ? progress || "Importing…" : `Import ${valid} product${valid === 1 ? "" : "s"}${usedFiles.size ? ` + ${usedFiles.size} images` : ""}`}
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
            <li><code>images</code> — image URLs or uploaded file names, separated by <code>|</code></li>
            <li><code>featured</code>, <code>active</code> — true / false</li>
          </ul>
          <h3 className="mt-4 font-semibold">Images without an images column</h3>
          <p className="mt-1 text-slate-500">
            Name files after the SKU or product name. Extra photos: add <code>-2</code>, <code>-3</code>… (e.g. <code>GWS-750.jpg</code>, <code>GWS-750-2.jpg</code>). The first one becomes the main image.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <a href="/api/admin/export/template" className="btn-secondary w-full" download><Download className="h-4 w-4" /> Download template</a>
            <a href="/api/admin/export/products" className="btn-ghost w-full" download>Export current catalog</a>
          </div>
        </div>
      </div>
    </div>
  );
}

/** First matched image as a small thumbnail, plus a count of extra images. */
function RowThumb({ refs }: { refs: (string | File)[] }) {
  const first = refs[0];
  const src = useMemo(() => (first instanceof File ? URL.createObjectURL(first) : first), [first]);
  if (!first) return <span className="text-xs text-slate-300">—</span>;
  return (
    <span className="flex items-center gap-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-9 w-9 rounded-md border border-slate-200 bg-white object-contain" />
      {refs.length > 1 && <span className="text-xs text-slate-500">+{refs.length - 1}</span>}
    </span>
  );
}
