"use client";

import { useState } from "react";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { Phone, MessageCircle, Copy, Check, AlertCircle } from "lucide-react";

export function CustomerPhoneActions({ rawPhone }: { rawPhone: string }) {
  const [copied, setCopied] = useState(false);
  const [showViberFallback, setShowViberFallback] = useState(false);

  // Parse phone number with Nepal ("NP") as default fallback for 10-digit mobile numbers
  const parsed = parsePhoneNumberFromString(rawPhone.trim().replace(/^00/, "+"), "NP");
  const valid = parsed && parsed.isValid() ? parsed : null;

  const displayPhone = valid ? valid.formatInternational() : rawPhone;
  const e164 = valid ? valid.number : rawPhone.replace(/\s+/g, "");
  const digits = valid ? valid.number.replace("+", "") : "";

  const handleCopy = async (): Promise<boolean> => {
    try {
      if (!navigator.clipboard?.writeText) return false;
      await navigator.clipboard.writeText(valid ? e164 : rawPhone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      return false;
    }
  };

  const handleViberClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowViberFallback(false);

    if (!valid) return;

    // Documented Viber deep link format across platforms: viber://chat?number=%2B...
    const url = `viber://chat?number=${encodeURIComponent(e164)}`;

    let opened = false;
    const markOpened = () => {
      opened = true;
    };

    window.addEventListener("blur", markOpened, { once: true });
    document.addEventListener("visibilitychange", markOpened, { once: true });

    window.location.href = url;

    // Wait 2.5s before showing polite prompt in case the user was reviewing the browser's "Open App" prompt
    setTimeout(() => {
      window.removeEventListener("blur", markOpened);
      document.removeEventListener("visibilitychange", markOpened);
      if (!opened) {
        setShowViberFallback(true);
      }
    }, 2500);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-[var(--color-navy)]">{displayPhone}</span>

        {!valid && (
          <span
            title="Number may be missing country code or has invalid digits"
            className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200"
          >
            <AlertCircle className="h-3 w-3" />
            Check format
          </span>
        )}

        <div className="flex items-center gap-1.5">
          {/* Direct Call: kept for both valid and raw */}
          <a
            href={`tel:${valid ? e164 : rawPhone}`}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--color-sand)] bg-[var(--color-cream-alt)]/60 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-navy)] hover:bg-white hover:border-[var(--color-navy)]/30 transition-colors"
          >
            <Phone className="h-3 w-3 text-slate-500" />
            Call
          </a>

          {/* WhatsApp: only clickable if number is valid */}
          {valid ? (
            <a
              href={`https://wa.me/${digits}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle className="h-3 w-3 text-emerald-600" />
              WhatsApp
            </a>
          ) : (
            <span
              title="WhatsApp requires a valid international phone format"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-400 cursor-not-allowed"
            >
              <MessageCircle className="h-3 w-3 text-slate-400" />
              WhatsApp
            </span>
          )}

          {/* Viber: only clickable if number is valid */}
          {valid ? (
            <button
              type="button"
              onClick={handleViberClick}
              className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50/70 px-2 py-0.5 text-[11px] font-semibold text-purple-800 hover:bg-purple-100 transition-colors"
            >
              <MessageCircle className="h-3 w-3 text-purple-600" />
              Viber
            </button>
          ) : (
            <span
              title="Viber requires a valid international phone format"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-400 cursor-not-allowed"
            >
              <MessageCircle className="h-3 w-3 text-slate-400" />
              Viber
            </span>
          )}

          {/* Manual Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            title="Copy phone number"
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Polite Viber fallback notice without false claims or silent clipboard hijacking */}
      {showViberFallback && (
        <div className="flex items-center gap-2 text-[11px] text-amber-800 bg-amber-50/90 border border-amber-200 rounded-lg px-2.5 py-1 w-fit animate-in fade-in duration-200">
          <span>Viber may not have opened.</span>
          <button
            type="button"
            onClick={handleCopy}
            className="font-semibold underline hover:text-amber-950 transition-colors cursor-pointer"
          >
            Copy number instead?
          </button>
          <button
            type="button"
            onClick={() => setShowViberFallback(false)}
            className="ml-1 text-amber-500 hover:text-amber-800 text-xs leading-none cursor-pointer"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
