"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

export function ScrollReveal({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect prefers-reduced-motion
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    // Target the actual product cards (not the wrapper)
    const cards = container.querySelectorAll("[data-product-card]");

    // Fallback: if no cards found, return early
    if (cards.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.from(cards, {
        y: 20,
        scale: 0.95,
        opacity: 0,
        duration: 0.5,
        stagger: 0.06,
        ease: "power2.out",
        clearProps: "all", // removes inline styles after animation finishes
        scrollTrigger: {
          trigger: container,
          start: "top 88%",
          once: true, // only animate once
        },
      });
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      {children}
    </div>
  );
}