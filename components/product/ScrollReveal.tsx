"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

export function ScrollReveal({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Target the actual product cards (not the wrapper)
    const cards = container.querySelectorAll("[data-product-card]");

    // Fallback: if no cards found, just show the content
    if (cards.length === 0) {
      gsap.set(container, { opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.from(cards, {
        y: 24,
        opacity: 0,
        duration: 0.55,
        stagger: 0.07,
        ease: "power2.out",
        clearProps: "all", // important – removes inline styles after animation
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