import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — ABXV",
  description: "ABXV terms of service governing purchases, pricing, orders, and user conduct.",
};

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[var(--color-cream)] text-[var(--color-navy)] pb-24">
      <section className="mx-auto max-w-3xl px-6 pt-12 pb-8 text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-navy)]/55 block">
          USER AGREEMENT
        </span>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-extrabold text-[var(--color-navy)]">
          Terms of Service
        </h1>
        <p className="mt-2 text-xs text-[var(--color-navy)]/60">
          Last updated: September 2026
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 mt-6">
        <div className="rounded-3xl border border-[var(--color-sand)] bg-white p-8 sm:p-10 shadow-xs space-y-6 text-xs sm:text-sm text-[var(--color-navy)]/80 leading-relaxed">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)] mb-2">
              1. Agreement to Terms
            </h2>
            <p>
              By accessing our store, creating an account, or placing an order through ABXV, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our services.
            </p>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)] mb-2">
              2. Orders &amp; Pricing
            </h2>
            <p>
              All orders placed are subject to inventory availability and acceptance. We reserve the right to cancel or refuse any order in cases of pricing inaccuracies, suspicious fraudulent activity, or unexpected inventory depletion. In such cases, any pre-authorized or captured payment will be promptly refunded in full.
            </p>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)] mb-2">
              3. Promotional Codes &amp; Coupons
            </h2>
            <p>
              Promotional codes, discount coupons, and referral benefits must be applied prior to order completion. Coupons may not be exchanged for cash, combined with unauthorized offers, or applied retroactively to previously finalized purchases.
            </p>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)] mb-2">
              4. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of Nepal. Any disputes arising in connection with purchases shall be subject to the exclusive jurisdiction of the competent courts in Kathmandu.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
