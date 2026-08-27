"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyOrderId({ orderId }: { orderId: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(orderId);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = orderId;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.dispatchEvent(
      new CustomEvent("show-toast", { detail: "Order ID copied to clipboard" })
    );
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "ml-2 inline-flex items-center gap-1.5 rounded-full border border-navy/20 bg-transparent px-3 py-1 text-sm font-medium text-navy transition-colors hover:bg-navy hover:text-cream"
      )}
      aria-label="Copy order ID"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
