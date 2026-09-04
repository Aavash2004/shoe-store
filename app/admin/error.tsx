"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShieldAlert, RotateCcw, LayoutDashboard } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Admin Dashboard Error Boundary]:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 shadow-2xs">
        <ShieldAlert className="h-7 w-7" />
      </div>

      <span className="text-[10px] font-bold uppercase tracking-widest text-rose-600 mb-1">
        Admin Portal Warning
      </span>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-[var(--color-navy)] max-w-md">
        Failed to load Admin View
      </h1>
      <p className="mt-2 max-w-md text-xs leading-relaxed text-[var(--color-navy)]/65">
        An error occurred while loading this section of the admin dashboard. You can reload this view or return to the main dashboard.
      </p>

      {process.env.NODE_ENV !== "production" && error.message && (
        <div className="mt-4 max-w-lg overflow-x-auto rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-left font-mono text-[11px] text-rose-800">
          <p className="font-bold">Error Message:</p>
          <p className="mt-1 whitespace-pre-wrap">{error.message}</p>
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-navy)] px-5 py-2.5 text-xs font-bold text-[var(--color-cream)] hover:bg-[var(--color-navy)]/90 transition-all shadow-2xs active:scale-95"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reload Section</span>
        </button>

        <Link
          href="/admin"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] px-5 py-2.5 text-xs font-bold text-[var(--color-navy)] hover:border-[var(--color-navy)]/40 hover:bg-white transition-all shadow-2xs"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          <span>Admin Overview</span>
        </Link>
      </div>
    </div>
  );
}
