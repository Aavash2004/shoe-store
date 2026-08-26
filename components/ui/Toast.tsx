"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

export function Toast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    function handleToast(e: Event) {
      const custom = e as CustomEvent<string>;
      setMessage(custom.detail);
      setTimeout(() => setMessage(null), 2500);
    }

    window.addEventListener("show-toast", handleToast);
    return () => window.removeEventListener("show-toast", handleToast);
  }, []);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-medium text-cream shadow-lg">
        <Check className="h-4 w-4" />
        {message}
      </div>
    </div>
  );
}