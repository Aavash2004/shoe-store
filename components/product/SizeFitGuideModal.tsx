"use client";

import { useEffect, useState } from "react";
import { X, Ruler, Footprints, Info, Check, Sparkles } from "lucide-react";
import { SIZING_MATRIX, SizeConversion } from "@/lib/constants/sizing";

interface SizeFitGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSize?: string | null;
  gender?: string;
}

export function SizeFitGuideModal({
  isOpen,
  onClose,
  selectedSize,
  gender = "UNISEX",
}: SizeFitGuideModalProps) {
  const [activeTab, setActiveTab] = useState<"chart" | "measure" | "tips">("chart");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[var(--color-navy)]/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-[var(--color-sand)] bg-[var(--color-cream)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-sand)] px-6 py-5 bg-[var(--color-cream-alt)]/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-navy)] text-[var(--color-cream)] shadow-xs">
              <Ruler className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-[var(--color-navy)] leading-tight">
                Size & Fit Guide
              </h2>
              <p className="text-xs text-[var(--color-navy)]/55">
                International footwear conversions & foot measurement
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--color-sand)] text-[var(--color-navy)]/60 hover:text-[var(--color-navy)] hover:bg-[var(--color-cream)] transition-all"
            aria-label="Close size guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--color-sand)] px-6 bg-[var(--color-cream)] text-xs font-bold">
          <button
            onClick={() => setActiveTab("chart")}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all ${
              activeTab === "chart"
                ? "border-[var(--color-navy)] text-[var(--color-navy)]"
                : "border-transparent text-[var(--color-navy)]/50 hover:text-[var(--color-navy)]"
            }`}
          >
            <Ruler className="h-3.5 w-3.5" />
            Conversion Chart
          </button>
          <button
            onClick={() => setActiveTab("measure")}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all ${
              activeTab === "measure"
                ? "border-[var(--color-navy)] text-[var(--color-navy)]"
                : "border-transparent text-[var(--color-navy)]/50 hover:text-[var(--color-navy)]"
            }`}
          >
            <Footprints className="h-3.5 w-3.5" />
            How to Measure
          </button>
          <button
            onClick={() => setActiveTab("tips")}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all ${
              activeTab === "tips"
                ? "border-[var(--color-navy)] text-[var(--color-navy)]"
                : "border-transparent text-[var(--color-navy)]/50 hover:text-[var(--color-navy)]"
            }`}
          >
            <Info className="h-3.5 w-3.5" />
            Fit Tips
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: CONVERSION TABLE */}
          {activeTab === "chart" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[var(--color-navy)]/60">
                <span>All measurements represent standard athletic footwear.</span>
                {selectedSize && (
                  <span className="font-semibold text-[var(--color-navy)] flex items-center gap-1 bg-[var(--color-sky)]/15 px-2.5 py-1 rounded-full text-[11px]">
                    <Check className="h-3 w-3" /> Selected EU {selectedSize}
                  </span>
                )}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[var(--color-sand)] bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--color-cream-alt)] border-b border-[var(--color-sand)] font-bold text-[var(--color-navy)]">
                    <tr>
                      <th className="px-4 py-3">EU</th>
                      <th className="px-4 py-3">US Men</th>
                      <th className="px-4 py-3">US Women</th>
                      <th className="px-4 py-3">UK</th>
                      <th className="px-4 py-3 text-right">Length (CM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-sand)]/50 font-medium text-[var(--color-navy)]/80">
                    {SIZING_MATRIX.map((row) => {
                      const isHighlighted =
                        selectedSize &&
                        (row.eu === selectedSize ||
                          row.eu === selectedSize.replace(",", "."));

                      return (
                        <tr
                          key={row.eu}
                          className={`transition-colors ${
                            isHighlighted
                              ? "bg-[var(--color-sky)]/20 font-bold text-[var(--color-navy)]"
                              : "hover:bg-[var(--color-cream-alt)]/40"
                          }`}
                        >
                          <td className="px-4 py-2.5 font-bold text-[var(--color-navy)]">
                            {row.eu}
                            {isHighlighted && (
                              <span className="ml-2 text-[10px] text-[var(--color-navy)]/60 font-normal">
                                (Selected)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">{row.usMen}</td>
                          <td className="px-4 py-2.5">{row.usWomen}</td>
                          <td className="px-4 py-2.5">{row.uk}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold">
                            {row.cm} cm
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: HOW TO MEASURE */}
          {activeTab === "measure" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]/40 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-navy)] text-xs font-bold text-[var(--color-cream)]">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[var(--color-navy)]">
                      Tape a sheet of paper to the floor
                    </h4>
                    <p className="mt-1 text-xs text-[var(--color-navy)]/70 leading-relaxed">
                      Place the paper against a flat wall. Stand upright on the paper with your heel firmly against the wall, wearing the socks you intend to use.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 border-t border-[var(--color-sand)]/60 pt-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-navy)] text-xs font-bold text-[var(--color-cream)]">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[var(--color-navy)]">
                      Mark your longest toe
                    </h4>
                    <p className="mt-1 text-xs text-[var(--color-navy)]/70 leading-relaxed">
                      Have someone mark the tip of your longest toe (usually the big toe or second toe) on the paper with a pen held perpendicular to the floor.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 border-t border-[var(--color-sand)]/60 pt-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-navy)] text-xs font-bold text-[var(--color-cream)]">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[var(--color-navy)]">
                      Measure in centimeters (CM)
                    </h4>
                    <p className="mt-1 text-xs text-[var(--color-navy)]/70 leading-relaxed">
                      Measure from the edge of the paper (heel) to the marked pencil line. Compare your measurement in centimeters with the conversion chart.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[var(--color-sky)]/15 border border-[var(--color-sky)]/30 p-4 flex items-center gap-3 text-xs text-[var(--color-navy)] font-semibold">
                <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-navy)]" />
                <span>Pro Tip: Measure your feet in the afternoon or evening when they are naturally at their largest.</span>
              </div>
            </div>
          )}

          {/* TAB 3: FIT TIPS */}
          {activeTab === "tips" && (
            <div className="space-y-4 text-xs text-[var(--color-navy)]/80 leading-relaxed">
              <div className="rounded-2xl border border-[var(--color-sand)] bg-white p-5 space-y-2">
                <h4 className="font-bold text-sm text-[var(--color-navy)] flex items-center gap-2">
                  <Info className="h-4 w-4 text-[var(--color-sky)]" />
                  Between Sizes?
                </h4>
                <p>
                  If your foot measurement falls right between two sizes on the chart:
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2 text-[var(--color-navy)]/70">
                  <li>For running and active performance, we recommend <strong>sizing up a half size</strong> to give toes breathing room during foot flexion.</li>
                  <li>For low-top lifestyle sneakers, your true size will provide a locked-in, snug feel.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-[var(--color-sand)] bg-white p-5 space-y-2">
                <h4 className="font-bold text-sm text-[var(--color-navy)] flex items-center gap-2">
                  <Footprints className="h-4 w-4 text-[var(--color-sky)]" />
                  Wide Feet or High Arches
                </h4>
                <p>
                  If you have wider feet or a high instep, selecting a half-size larger provides optimal forefoot comfort and prevents side pinch without heel slipping.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--color-sand)] bg-[var(--color-cream-alt)]/50 px-6 py-4 flex items-center justify-between">
          <span className="text-[11px] text-[var(--color-navy)]/50">
            Need help? Reach out via contact@abxv.com
          </span>
          <button
            onClick={onClose}
            className="rounded-xl bg-[var(--color-navy)] px-5 py-2 text-xs font-bold text-[var(--color-cream)] hover:bg-[var(--color-navy)]/90 transition-all shadow-xs"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}
