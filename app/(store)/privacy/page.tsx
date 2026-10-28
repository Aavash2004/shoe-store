import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { User, CreditCard, ShieldCheck, Bug, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — ABXV",
  description:
    "ABXV privacy policy explaining data collection, payment protection, telemetry diagnostics, and customer rights under applicable regulations.",
};

const policySections = [
  {
    id: 1,
    title: "1. Information We Collect",
    icon: User,
    content: (
      <>
        When you browse, register, or complete a purchase at ABXV, we collect
        information necessary to fulfill your orders, provide personalized sizing
        suggestions, and ensure secure payments. This includes your name,
        delivery address, contact email, phone number, and transaction
        identifiers.
      </>
    ),
  },
  {
    id: 2,
    title: "2. Payment Information",
    icon: CreditCard,
    content: (
      <>
        All online card payments are handled securely through PCI-DSS Level 1
        certified gateway Stripe, and domestic digital wallet payments are
        processed directly by Khalti. ABXV does not store full credit card
        numbers or banking PIN credentials on its servers.
      </>
    ),
  },
  {
    id: 3,
    title: "3. Data Security & Sharing",
    icon: ShieldCheck,
    content: (
      <>
        We do not sell, rent, or trade your personal data with third-party
        advertising brokers. Data is shared exclusively with our essential
        logistics providers (regional courier partners: DHL, FedEx) strictly to
        execute package delivery.
      </>
    ),
  },
  {
    id: 4,
    title: "4. Error Telemetry & Security Diagnostics",
    icon: Bug,
    content: (
      <>
        To maintain system uptime, detect bot attacks, and fix technical bugs,
        our platform uses telemetry and security diagnostics services (including
        Sentry for application crash monitoring and Upstash for distributed rate
        limiting). These diagnostics capture technical error traces while
        stripping sensitive personal identifiers, passwords, and payment card
        numbers.
      </>
    ),
  },
  {
    id: 5,
    title: "5. Your Rights",
    icon: Lock,
    content: (
      <>
        You have the right to request access to, correction of, or deletion of
        your personal account information at any time by contacting our data
        protection officer at{" "}
        <a
          href="mailto:privacy@abxv.com"
          className="font-medium text-blue-600 underline transition-colors hover:text-blue-700"
        >
          privacy@abxv.com
        </a>
        .
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
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
              Privacy Policy
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
              <span>Your data.</span>
              <br />
              <span className="text-neutral-500/80">Our priority.</span>
            </div>

            {/* Dynamic Angled Sneaker Image Frame */}
            <div className="relative h-44 w-52 sm:h-56 sm:w-68 lg:h-64 lg:w-80 overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/60 bg-white/60 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.08)] backdrop-blur-xs transition-transform duration-500 hover:scale-[1.02]">
              <Image
                src="/images/legal/privacy-hero.jpg"
                alt="Nike Dunk Low Navy"
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
      {/* Main Content Card: Numbered Policy Sections with Badges       */}
      {/* ============================================================ */}
      <main className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 pb-24 sm:pb-32">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 md:p-12 shadow-[0_16px_50px_-12px_rgba(15,23,42,0.06)]">
          <div className="divide-y divide-slate-100">
            {policySections.map((section) => {
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
