"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error Boundary caught error]:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-50 text-[#1E2A38] font-sans">
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 shadow-sm text-xl font-bold">
            ⚠️
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E2A38]">
            Critical System Error
          </h1>
          <p className="mt-2 max-w-md text-xs text-slate-600 leading-relaxed">
            A critical system error occurred. Please try reloading the application.
          </p>

          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 rounded-xl bg-[#1E2A38] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#1E2A38]/90 transition-all shadow-sm"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
