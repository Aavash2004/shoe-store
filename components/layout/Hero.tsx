"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { gsap } from "@/lib/gsap";



export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mainImgRef = useRef<HTMLDivElement>(null);
  const secondaryImgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(contentRef.current, {
        y: 30,
        opacity: 0,
        duration: 0.85,
      })
        .from(
          mainImgRef.current,
          { y: 50, opacity: 0, duration: 1, ease: "power2.out" },
          "-=0.55"
        )
        .from(
          secondaryImgRef.current,
          { y: 30, opacity: 0, duration: 0.8 },
          "-=0.7"
        );

      // Subtle float on main image
      gsap.to(mainImgRef.current, {
        y: -12,
        duration: 3.8,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[calc(100vh-73px)] items-center overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/shoes/f.avif"
          alt="Shoe store background"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0
        -to-r from-black/80 via-black/50 to-black/20" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center gap-14 px-6 py-20 md:flex-row md:items-center md:justify-between md:gap-12 md:py-0">

        {/* Text */}
        <div ref={contentRef} className="max-w-lg text-center md:text-left">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-white/65">
            New Collection
          </p>

          <h1 className="font-[family-name:var(--font-display)] text-[3.1rem] leading-[1.08] tracking-tight text-white sm:text-5xl md:text-[3.85rem]">
            Step Into
            <br />
            Something Bold
          </h1>

          <p className="mt-5 max-w-md text-lg leading-relaxed text-white/70">
            Premium shoes, thoughtfully made for every mile.
          </p>

          <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center md:justify-start">
            <Button
              size="lg"
              className="h-12 rounded-full bg-white px-8 text-sm font-medium text-navy hover:bg-white/90"
              asChild
            >
              <Link href="/shop">Shop Now</Link>
            </Button>
          </div>
        </div>

        {/* Clean product images */}
        <div className="relative h-[340px] w-full max-w-md md:h-[480px] md:w-[46%]">
          {/* Main product image */}
          <div
            ref={mainImgRef}
            className="absolute right-0 top-0 h-full w-[78%] overflow-hidden rounded-2xl shadow-2xl"
          >
            <Image
              src="/images/hero/hero1.avif"
              alt="Featured shoe"
              fill
              className="object-cover"
              sizes="40vw"
              priority
            />
          </div>

          {/* Small secondary image */}
          <div
            ref={secondaryImgRef}
            className="absolute bottom-6 left-0 h-[42%] w-[42%] overflow-hidden rounded-xl border-[3px] border-white/15 shadow-xl"
          >
            <Image
              src="/images/hero/hero2.avif"
              alt="Featured shoe detail"
              fill
              className="object-cover"
              sizes="22vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}