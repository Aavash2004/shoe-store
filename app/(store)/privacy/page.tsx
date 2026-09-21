import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — ABXV",
  description: "ABXV privacy policy explaining data collection, protection, and customer rights under applicable regulations.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[var(--color-cream)] text-[var(--color-navy)] pb-24">
      <section className="mx-auto max-w-3xl px-6 pt-12 pb-8 text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-navy)]/55 block">
          LEGAL &amp; COMPLIANCE
        </span>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-extrabold text-[var(--color-navy)]">
          Privacy Policy
        </h1>
        <p className="mt-2 text-xs text-[var(--color-navy)]/60">
          Last updated: September 2026
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 mt-6">
        <div className="rounded-3xl border border-[var(--color-sand)] bg-white p-8 sm:p-10 shadow-xs space-y-6 text-xs sm:text-sm text-[var(--color-navy)]/80 leading-relaxed">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)] mb-2">
              1. Information We Collect
            </h2>
            <p>
              When you browse, register, or complete a purchase at ABXV, we collect information necessary to fulfill your orders, provide personalized sizing suggestions, and ensure secure payments. This includes your name, delivery address, contact email, phone number, and transaction identifiers.
            </p>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)] mb-2">
              2. Payment Information
            </h2>
            <p>
              All online card payments are handled securely through PCI-DSS Level 1 certified gateway Stripe, and domestic digital wallet payments are processed directly by Khalti. ABXV does not store full credit card numbers or banking PIN credentials on its servers.
            </p>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)] mb-2">
              3. Data Security &amp; Sharing
            </h2>
            <p>
              We do not sell, rent, or trade your personal data with third-party advertising brokers. Data is shared exclusively with our essential logistics providers (regional courier partners, DHL, FedEx) strictly to execute package delivery.
            </p>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)] mb-2">
              4. Your Rights
            </h2>
            <p>
              You have the right to request access to, correction of, or deletion of your personal account information at any time by contacting our data protection officer at <a href="mailto:privacy@abxv.com" className="font-semibold underline">privacy@abxv.com</a>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
