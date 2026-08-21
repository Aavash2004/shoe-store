"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { gsap } from "@/lib/gsap";

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const img1Ref = useRef<HTMLDivElement>(null);
  const img2Ref = useRef<HTMLDivElement>(null);
  const img3Ref = useRef<HTMLDivElement>(null);
  const img4Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(contentRef.current, { y: 30, opacity: 0, duration: 0.8 })
        .from(img1Ref.current, { y: 40, opacity: 0, duration: 0.85 }, "-=0.5")
        .from(img2Ref.current, { y: 40, opacity: 0, duration: 0.85 }, "-=0.7")
        .from(img3Ref.current, { y: 30, opacity: 0, duration: 0.75 }, "-=0.65")
        .from(img4Ref.current, { y: 30, opacity: 0, duration: 0.75 }, "-=0.65");

      // Very subtle float
      gsap.to([img1Ref.current, img2Ref.current], {
        y: -8,
        duration: 4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      gsap.to([img3Ref.current, img4Ref.current], {
        y: -6,
        duration: 3.6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 0.6,
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
          src="/images/hero/bg.avif"
          alt="Shoe store background"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/25" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center gap-16 px-6 py-20 md:flex-row md:items-center md:justify-between md:gap-10 md:py-0">
        
        {/* Text */}
        <div ref={contentRef} className="max-w-lg text-center md:text-left">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-white/65">
            New Collection
          </p>

          <h1 className="font-[family-name:var(--font-display)] text-[3.1rem] leading-[1.08] tracking-tight text-white sm:text-5xl md:text-[3.75rem]">
            Step Into
            <br />
            Something Bold
          </h1>

          <p className="mt-5 max-w-md text-lg leading-relaxed text-white/70">
            Premium shoes, thoughtfully made for every mile.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center md:justify-start">
            <Button
              size="lg"
              className="h-12 rounded-full bg-white px-8 text-sm font-medium text-navy hover:bg-white/90"
              asChild
            >
              <Link href="/shop">Shop Now</Link>
            </Button>

            <Link
              href="/shop"
              className="group flex items-center gap-1.5 text-sm font-medium text-white/75 transition-colors hover:text-white"
            >
              Explore Collections
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </div>

        {/* Clean structured cluster */}
        <div className="relative grid h-[380px] w-full max-w-md grid-cols-12 grid-rows-6 gap-3 md:h-[460px] md:w-[48%]">
          
          {/* Main large image */}
          <div
            ref={img1Ref}
            className="col-span-7 col-start-6 row-span-4 row-start-1 overflow-hidden rounded-2xl shadow-2xl"
          >
            <Image
              src="/images/hero/hero1.avif"
              alt="Featured shoe 1"
              fill
              className="object-cover"
              sizes="40vw"
              priority
            />
          </div>

          {/* Second image */}
          <div
            ref={img2Ref}
            className="col-span-5 col-start-1 row-span-3 row-start-3 overflow-hidden rounded-2xl shadow-2xl"
          >
            <Image
              src="/images/hero/hero2.avif"
              alt="Featured shoe 2"
              fill
              className="object-cover"
              sizes="28vw"
            />
          </div>

          {/* Third image */}
          <div
            ref={img3Ref}
            className="col-span-4 col-start-5 row-span-2 row-start-5 overflow-hidden rounded-xl shadow-xl"
          >
            <Image
              src="/images/hero/h3.avif"
              alt="Featured shoe 3"
              fill
              className="object-cover"
              sizes="20vw"
            />
          </div>

          {/* Fourth image */}
          <div
            ref={img4Ref}
            className="col-span-3 col-start-10 row-span-2 row-start-5 overflow-hidden rounded-xl shadow-xl"
          >
            <Image
              src="/images/hero/hero4.avif"
              alt="Featured shoe 4"
              fill
              className="object-cover"
              sizes="16vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}