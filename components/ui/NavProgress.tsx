"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/** Thin top progress bar that starts the instant an internal link is clicked. */
function Bar() {
  const pathname = usePathname();
  const params = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      clearInterval(timer.current);
      setVisible(true);
      setProgress(12);
      timer.current = setInterval(() => setProgress((p) => (p < 85 ? p + (90 - p) * 0.12 : p)), 200);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Route committed → finish the bar.
  useEffect(() => {
    clearInterval(timer.current);
    setProgress(100);
    const t = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 250);
    return () => clearTimeout(t);
  }, [pathname, params]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px]" aria-hidden>
      <div
        className="h-full bg-gradient-to-r from-brand-500 via-fuchsia-500 to-brand-600 shadow-[0_0_10px_rgba(99,102,241,0.7)] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: visible ? 1 : 0 }}
      />
    </div>
  );
}

export function NavProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
