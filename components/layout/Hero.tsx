"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { gsap } from "@/lib/gsap";

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const imgWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
      });

      tl.from(eyebrowRef.current, {
        y: 16,
        opacity: 0,
        duration: 0.5,
      })
        .from(
          headingRef.current,
          { y: 40, opacity: 0, duration: 0.8 },
          "-=0.3"
        )
        .from(
          subRef.current,
          { y: 24, opacity: 0, duration: 0.6 },
          "-=0.45"
        )
        .from(
          ctaRef.current,
          { y: 20, opacity: 0, duration: 0.55 },
          "-=0.4"
        )
        .from(
          imgWrapRef.current,
          { x: 40, opacity: 0, duration: 1, ease: "power2.out" },
          "-=0.9"
        );

      // Continuous gentle float (disabled if user prefers reduced motion)
      gsap.to(imgWrapRef.current, {
        y: -14,
        duration: 3.2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });

      // Subtle parallax on scroll
      gsap.to(imgWrapRef.current, {
        yPercent: 6,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative z-0 flex min-h-[calc(100vh-73px)] items-center overflow-hidden bg-cream"
    >
      {/* Soft left-side gradient for text readability */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-cream via-cream/60 to-transparent" />

      {/* Decorative soft glow behind the shoe */}
      <div className="pointer-events-none absolute right-[-10%] top-1/2 z-0 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-navy/[0.04] blur-3xl md:right-[5%] md:h-[520px] md:w-[520px]" />

      <div className="relative z-20 mx-auto flex w-full max-w-7xl flex-col items-center gap-12 px-6 py-16 md:flex-row md:items-center md:justify-between md:gap-8 md:py-0">
        {/* Text column */}
        <div className="max-w-xl text-center md:text-left">
          <p
            ref={eyebrowRef}
            className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-navy/60"
          >
            New Collection
          </p>

          <h1
            ref={headingRef}
            className="font-[family-name:var(--font-display)] text-5xl leading-[1.1] text-navy sm:text-6xl md:text-6xl lg:text-7xl"
          >
            Step Into
            <br />
            Something Bold
          </h1>

          <p
            ref={subRef}
            className="mt-5 max-w-md text-lg leading-relaxed text-navy/80 md:text-xl"
          >
          </p>

          <div
            ref={ctaRef}
            className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center md:justify-start"
          >
            <Button size="lg" >
              <Link href="/shop">Shop Now</Link>
            </Button>

            <Link
              href="/collections"
              className="text-sm font-medium text-navy/70 underline-offset-4 transition-colors hover:text-navy hover:underline"
            >
              Explore Collections →
            </Link>
          </div>
        </div>

        {/* Shoe image column */}
        <div
          ref={imgWrapRef}
          className="relative h-[300px] w-full max-w-md md:h-[480px] md:max-w-none md:w-[52%]"
        >
          {/* Soft shadow under the shoe */}
          <div className="pointer-events-none absolute bottom-6 left-1/2 h-8 w-3/5 -translate-x-1/2 rounded-[100%] bg-navy/10 blur-xl md:bottom-10" />

          <Image
            src="/images/Shoes/a01.avif"
            alt="Featured premium shoe"
            fill
            priority
            sizes="(max-width: 768px) 90vw, 50vw"
            className="object-contain object-center drop-shadow-2xl md:object-right"
          />
        </div>
      </div>
    </section>
  );
}