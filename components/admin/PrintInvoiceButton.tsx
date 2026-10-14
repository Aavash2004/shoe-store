"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintInvoiceButton() {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.print()}
      className="h-10 rounded-xl border-[var(--color-sand)] bg-white text-xs font-semibold text-[var(--color-navy)] hover:bg-[var(--color-sand)]/20 transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
    >
      <Printer className="h-4 w-4 text-[var(--color-navy)]/70" />
      <span>Print Invoice</span>
    </Button>
  );
}
