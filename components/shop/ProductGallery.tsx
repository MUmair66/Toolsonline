"use client";

import { useState } from "react";
import { SafeImage } from "@/components/ui/SafeImage";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : [""];
  return (
    <div className="space-y-3">
      <div className="aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <SafeImage src={list[active]} alt={name} className="h-full w-full object-contain" />
      </div>
      {list.length > 1 && (
        <div className="grid grid-cols-5 gap-3">
          {list.map((img, i) => (
            <button
              key={img + i}
              onClick={() => setActive(i)}
              className={cn(
                "aspect-square overflow-hidden rounded-xl border-2 bg-slate-100 transition",
                i === active ? "border-brand-600" : "border-transparent opacity-70 hover:opacity-100"
              )}
              aria-label={`View image ${i + 1}`}
            >
              <SafeImage src={img} alt={`${name} ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
