"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-secondary !py-2" title="Print invoice">
      <Printer className="h-4 w-4" /> Print
    </button>
  );
}
