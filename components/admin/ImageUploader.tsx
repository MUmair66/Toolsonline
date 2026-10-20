"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Link2, Loader2, X } from "lucide-react";
import { uploadImage } from "@/actions/admin";
import { SafeImage } from "@/components/ui/SafeImage";

/**
 * Downscales big photos in the browser before upload (max 2000px JPEG), so uploads stay
 * well under hosting request limits (~4.5 MB on Vercel). The server then makes the final WebP.
 */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size < 1.5 * 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Manages a list of image URLs: upload files or paste URLs, reorder, remove. */
export function ImageUploader({
  name,
  initial,
  multiple = true,
}: {
  name: string;
  initial: string[];
  multiple?: boolean;
}) {
  const [images, setImages] = useState<string[]>(initial);
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const add = (u: string) => setImages((prev) => (multiple ? [...prev, u] : [u]));

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setUploading(true);
    for (const original of Array.from(files)) {
      const file = await shrink(original);
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadImage(fd);
      if (res.url) add(res.url);
      else setError(res.error || "Upload failed");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  const move = (i: number, dir: -1 | 1) =>
    setImages((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div>
      <input type="hidden" name={name} value={multiple ? JSON.stringify(images) : (images[0] ?? "")} />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((img, i) => (
          <div key={img + i} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <SafeImage src={img} alt="" className="h-full w-full object-cover" />
            {i === 0 && multiple && <span className="absolute top-1.5 left-1.5 badge bg-slate-900 text-white">Main</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/50 p-1 opacity-0 transition group-hover:opacity-100">
              {multiple ? (
                <>
                  <button type="button" onClick={() => move(i, -1)} className="rounded p-1 text-white hover:bg-white/20" aria-label="Move left"><ArrowLeft className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => move(i, 1)} className="rounded p-1 text-white hover:bg-white/20" aria-label="Move right"><ArrowRight className="h-3.5 w-3.5" /></button>
                </>
              ) : <span />}
              <button type="button" onClick={() => setImages((p) => p.filter((_, k) => k !== i))} className="rounded p-1 text-white hover:bg-red-500" aria-label="Remove image">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {(multiple || images.length === 0) && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 transition hover:border-brand-500 hover:text-brand-600"
          >
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
            <span className="text-xs font-medium">{uploading ? "Uploading..." : "Upload"}</span>
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => onFiles(e.target.files)} />
      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (url.trim()) { add(url.trim()); setUrl(""); }
              }
            }}
            placeholder="…or paste an image URL"
            className="input !py-2 pl-9"
          />
        </div>
        <button
          type="button"
          className="btn-secondary !py-2"
          onClick={() => { if (url.trim()) { add(url.trim()); setUrl(""); } }}
        >
          Add
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
