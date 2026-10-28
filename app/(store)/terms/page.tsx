import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FileText, ShoppingBag, Tag, UserCheck, Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service — ABXV",
  description:
    "ABXV terms of service governing purchases, pricing, orders, promotions, user conduct, and applicable governing law.",
};

const termsSections = [
  {
    id: 1,
    title: "1. Agreement to Terms",
    icon: FileText,
    content: (
      <>
        By accessing our store, creating an account, or placing an order through
        ABXV, you agree to be bound by these Terms of Service. If you do not
        agree with any part of these terms, you may not access or use our
        services.
      </>
    ),
  },
  {
    id: 2,
    title: "2. Orders & Pricing Integrity",
    icon: ShoppingBag,
    content: (
      <>
        All orders placed are subject to inventory availability and acceptance. We
        reserve the right to cancel or refuse any order in cases of typographical
        pricing inaccuracies, suspicious fraudulent activity, or unexpected
        inventory depletion. In such cases, any pre-authorized or captured
        payment will be promptly refunded in full via the original payment
        method.
      </>
    ),
  },
  {
    id: 3,
    title: "3. Promotional Codes & Loyalty Benefits",
    icon: Tag,
    content: (
      <>
        Promotional codes, discount coupons, and referral benefits must be
        applied prior to order completion at checkout. Coupons may not be
        exchanged for cash, combined with unauthorized third-party offers, or
        applied retroactively to previously finalized purchases.
      </>
    ),
  },
  {
    id: 4,
    title: "4. Account Responsibility & Conduct",
    icon: UserCheck,
    content: (
      <>
        You are responsible for safeguarding your login credentials and for all
        activities that occur under your account. ABXV reserves the right to
        suspend or terminate accounts that engage in automated scraping, bot
        purchasing, fraudulent chargebacks, or abusive behavior towards support
        staff.
      </>
    ),
  },
  {
    id: 5,
    title: "5. Governing Law & Jurisdiction",
    icon: Scale,
    content: (
      <>
        These Terms shall be governed by and construed in accordance with the
        substantive laws of Nepal. Any legal dispute or claim arising in
        connection with purchases through ABXV shall be subject to the exclusive
        jurisdiction of the competent courts in Kathmandu.
      </>
    ),
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#F8FAFC] text-slate-800">
      {/* ============================================================ */}
      {/* Background Watermarks & Decorative Branding Margins           */}
      {/* ============================================================ */}

      {/* Far Left Margin Decoration */}
      <div className="pointer-events-none absolute left-4 top-1/2 z-0 hidden -translate-y-1/2 flex-col items-start xl:flex">
        <span className="mb-2.5 h-[2px] w-6 rounded-full bg-[#FC563C]" />
        <span className="text-[9px] font-extrabold uppercase tracking-[0.28em] text-neutral-400/90 leading-relaxed">
          BETTER SHOES.
          <br />
          BOLDER STEPS.
        </span>
      </div>

      {/* Left Subtle Geometric Watermark */}
      <div className="pointer-events-none absolute -left-20 top-24 z-0 select-none opacity-[0.035]">
        <svg
          width="420"
          height="520"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon
            points="10,20 50,2 90,20 90,65 50,98 10,65"
            stroke="#0F172A"
            strokeWidth="3"
          />
          <path d="M25,50 L50,25 L75,50 L50,75 Z" stroke="#0F172A" strokeWidth="2" />
        </svg>
      </div>

      {/* Right Subtle Geometric Watermark */}
      <div className="pointer-events-none absolute -right-24 top-40 z-0 select-none opacity-[0.03]">
        <svg
          width="460"
          height="560"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20,10 L80,50 L20,90"
            stroke="#0F172A"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* ============================================================ */}
      {/* Hero Header Section with Title, Handwritten Callout & Sneaker */}
      {/* ============================================================ */}
      <header className="relative z-10 mx-auto max-w-6xl px-6 pt-10 sm:pt-14 lg:pt-16 pb-6">
        <div className="flex flex-col-reverse items-start justify-between gap-8 md:flex-row md:items-center">
          {/* Left Title Column */}
          <div className="max-w-xl">
            {/* Orange Accent Bar */}
            <span className="mb-3 block h-[2px] w-8 rounded-full bg-[#FC563C]" />

            {/* Category Tag */}
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-neutral-400">
              LEGAL &amp; COMPLIANCE
            </p>

            {/* Main Page Title */}
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-[#0F172A] sm:text-5xl lg:text-6xl">
              Terms of Service
            </h1>

            {/* Last Updated */}
            <p className="mt-2 text-xs font-medium text-neutral-400">
              Last updated: September 2026
            </p>
          </div>

          {/* Right Visual: Handwritten Callout + Dynamic Luxury Sneaker */}
          <div className="relative flex w-full items-center justify-end md:w-auto">
            {/* Elegant Handwritten Script */}
            <div className="mr-3 sm:mr-6 text-right select-none font-[family-name:var(--font-handwriting)] text-2xl sm:text-3xl lg:text-4xl text-neutral-400/90 leading-tight -rotate-6">
              <span>Fair terms.</span>
              <br />
              <span className="text-neutral-500/80">Confident steps.</span>
            </div>

            {/* Dynamic Angled Sneaker Image Frame */}
            <div className="relative h-44 w-52 sm:h-56 sm:w-68 lg:h-64 lg:w-80 overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/60 bg-white/60 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.08)] backdrop-blur-xs transition-transform duration-500 hover:scale-[1.02]">
              <Image
                src="/images/legal/terms-hero.jpg"
                alt="Nike Dunk Low University Blue"
                fill
                priority
                className="object-cover object-center"
                sizes="(max-width: 640px) 208px, (max-width: 1024px) 272px, 320px"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* Main Content Card: Numbered Terms Sections with Badges        */}
      {/* ============================================================ */}
      <main className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 pb-24 sm:pb-32">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 md:p-12 shadow-[0_16px_50px_-12px_rgba(15,23,42,0.06)]">
          <div className="divide-y divide-slate-100">
            {termsSections.map((section) => {
              const IconComponent = section.icon;
              return (
                <article
                  key={section.id}
                  className="flex items-start gap-4 sm:gap-6 py-6 first:pt-0 last:pb-0"
                >
                  {/* Icon Badge */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100/70 bg-blue-50/70 text-blue-600 shadow-xs">
                    <IconComponent className="h-5 w-5" aria-hidden="true" />
                  </div>

                  {/* Text Content */}
                  <div className="flex-1">
                    <h2 className="font-[family-name:var(--font-display)] text-base sm:text-lg font-bold tracking-tight text-slate-900">
                      {section.title}
                    </h2>
                    <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-slate-600 sm:leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
