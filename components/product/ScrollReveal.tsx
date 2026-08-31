"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface ScrollRevealProps {
  children: ReactNode;
  selector?: string;
  stagger?: number;
  y?: number;
}

export function ScrollReveal({
  children,
  selector,
  stagger = 0.06,
  y = 14,
}: ScrollRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ selector, stagger, y });
  propsRef.current = { selector, stagger, y };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect prefers-reduced-motion
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const { selector: sel, stagger: st, y: yPos } = propsRef.current;

    const targets = sel
      ? container.querySelectorAll(sel)
      : container.querySelectorAll("[data-product-card], [data-reveal-item]");

    const elementsToAnimate =
      targets.length > 0 ? Array.from(targets) : [container];

    const ctx = gsap.context(() => {
      gsap.from(elementsToAnimate, {
        y: yPos,
        opacity: 0,
        duration: 0.5,
        stagger: st,
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