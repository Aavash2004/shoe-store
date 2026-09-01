"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export interface ToastConfig {
  message: string;
  type?: "success" | "error" | "info";
}

export function Toast() {
  const [toast, setToast] = useState<ToastConfig | null>(null);

  useEffect(() => {
    function handleToast(e: Event) {
      const custom = e as CustomEvent<string | ToastConfig>;
      if (!custom.detail) return;

      if (typeof custom.detail === "string") {
        const text = custom.detail;
        const isSuccess =
          text.toLowerCase().includes("save") ||
          text.toLowerCase().includes("success") ||
          text.toLowerCase().includes("added");
        setToast({ message: text, type: isSuccess ? "success" : "info" });
      } else if (typeof custom.detail === "object") {
        setToast({
          message: custom.detail.message,
          type: custom.detail.type || "success",
        });
      }
    }

    window.addEventListener("show-toast", handleToast);
    return () => window.removeEventListener("show-toast", handleToast);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  const isSuccess = toast.type === "success";

  return (
    <div className="fixed top-6 right-6 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 text-xs font-bold shadow-2xl border backdrop-blur-md ${
          isSuccess
            ? "bg-emerald-950/95 text-emerald-100 border-emerald-500/40 shadow-emerald-950/30"
            : "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-sand)]/30"
        }`}
      >
        {isSuccess ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        ) : (
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
        )}
        <span className="tracking-wide">{toast.message}</span>
        <button
          type="button"
          onClick={() => setToast(null)}
          className="ml-2 text-white/60 hover:text-white transition-colors p-0.5"
          aria-label="Close notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}