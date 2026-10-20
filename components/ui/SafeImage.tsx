"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { PLACEHOLDER_IMAGE } from "@/lib/utils";

export function SafeImage({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      src={!src || failed ? PLACEHOLDER_IMAGE : src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
