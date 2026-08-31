"use client";

import { ShieldCheck, Truck, RotateCcw, Sparkles, Award } from "lucide-react";

const perks = [
  {
    icon: Truck,
    label: "FREE SHIPPING OVER $75",
  },
  {
    icon: RotateCcw,
    label: "EASY 30-DAY RETURNS",
  },
  {
    icon: ShieldCheck,
    label: "SECURE CHECKOUT",
  },
  {
    icon: Sparkles,
    label: "THOUGHTFULLY CRAFTED",
  },
  {
    icon: Award,
    label: "AUTHENTIC ABXV GUARANTEE",
  },
];

export function PerksMarquee() {
  return (
    <section className="relative overflow-hidden bg-[#1E2A38] text-[#F5F2EB] py-2.5 border-y border-[#89B4D9]/20 shadow-xs">
      {/* Gradient fading edges */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-[#1E2A38] to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-[#1E2A38] to-transparent" />

      {/* Infinite scrolling marquee track */}
      <div className="flex select-none overflow-hidden">
        <div className="animate-marquee flex shrink-0 items-center gap-10 sm:gap-14 pr-10 sm:pr-14">
          {/* Tripled list for seamless looping */}
          {[...perks, ...perks, ...perks].map((perk, index) => {
            const Icon = perk.icon;
            return (
              <div
                key={index}
                className="flex items-center gap-2 whitespace-nowrap cursor-pointer hover:opacity-85 transition-opacity"
              >
                <Icon className="h-3.5 w-3.5 text-[#89B4D9] shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">
                  {perk.label}
                </span>
                <span className="ml-3 text-[#89B4D9]/40 text-xs select-none">•</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
