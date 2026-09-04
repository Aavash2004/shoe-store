"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console or telemetry
    console.error("[Application Error Boundary caught error]:", error);
  }, [error]);

  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 shadow-2xs">
        <AlertCircle className="h-8 w-8" />
      </div>

      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-navy)]/55 mb-1">
        Application Error
      </span>
      <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-navy)] max-w-md">
        Something went wrong
      </h1>
      <p className="mt-2.5 max-w-md text-xs sm:text-sm leading-relaxed text-[var(--color-navy)]/65">
        We encountered an unexpected issue while loading this page. You can try refreshing or return to the homepage.
      </p>

      {process.env.NODE_ENV !== "production" && error.message && (
        <div className="mt-4 max-w-lg overflow-x-auto rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-left font-mono text-[11px] text-rose-800">
          <p className="font-bold">Error Details:</p>
          <p className="mt-1 whitespace-pre-wrap">{error.message}</p>
        </div>
      )}

      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-navy)] px-6 py-3 text-xs font-bold text-[var(--color-cream)] hover:bg-[var(--color-navy)]/90 transition-all shadow-2xs active:scale-95"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Try Again</span>
        </button>

        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] px-6 py-3 text-xs font-bold text-[var(--color-navy)] hover:border-[var(--color-navy)]/40 hover:bg-white transition-all shadow-2xs"
        >
          <Home className="h-3.5 w-3.5" />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
}
