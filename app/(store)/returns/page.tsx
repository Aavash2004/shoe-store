import { Metadata } from "next";
import { RotateCcw, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Returns & Exchanges — ABXV",
  description: "Learn about the ABXV 14-day hassle-free return and exchange policy for unworn footwear in original packaging.",
};

export default function ReturnsPolicyPage() {
  return (
    <main className="min-h-screen bg-[var(--color-cream)] text-[var(--color-navy)] pb-24">
      {/* Header */}
      <section className="mx-auto max-w-4xl px-6 pt-12 pb-8 text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-navy)]/55 block">
          SATISFACTION GUARANTEED
        </span>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-extrabold text-[var(--color-navy)]">
          Returns &amp; Exchanges
        </h1>
        <p className="mt-3 text-sm text-[var(--color-navy)]/65 max-w-md mx-auto leading-relaxed">
          We want you to love your shoes. If the fit or style isn&apos;t quite right, we offer a straightforward 14-day return and exchange window.
        </p>
      </section>

      {/* Main Content */}
      <section className="mx-auto max-w-4xl px-6 mt-6 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-5 text-center shadow-2xs">
            <RotateCcw className="h-6 w-6 text-[var(--color-navy)] mx-auto mb-2" />
            <h3 className="font-bold text-sm text-[var(--color-navy)]">14-Day Return Window</h3>
            <p className="text-xs text-[var(--color-navy)]/60 mt-1">From the date of parcel delivery</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-5 text-center shadow-2xs">
            <ShieldCheck className="h-6 w-6 text-[var(--color-navy)] mx-auto mb-2" />
            <h3 className="font-bold text-sm text-[var(--color-navy)]">Unworn &amp; Pristine</h3>
            <p className="text-xs text-[var(--color-navy)]/60 mt-1">With original tags &amp; shoebox intact</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-5 text-center shadow-2xs">
            <CheckCircle2 className="h-6 w-6 text-[var(--color-navy)] mx-auto mb-2" />
            <h3 className="font-bold text-sm text-[var(--color-navy)]">Fast Size Exchanges</h3>
            <p className="text-xs text-[var(--color-navy)]/60 mt-1">Free first size exchange in Nepal</p>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--color-sand)] bg-white p-8 sm:p-10 shadow-xs space-y-8 text-xs sm:text-sm text-[var(--color-navy)]/80 leading-relaxed">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-navy)] mb-3">
              Eligibility Criteria
            </h2>
            <p>
              To ensure safety and quality for all customers, returned shoes must meet the following baseline conditions:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-2 text-xs text-[var(--color-navy)]/75">
              <li>Shoes must be in brand new, unworn condition. We encourage trying them on clean indoor carpeted surfaces.</li>
              <li>Must be returned in the original branded shoebox, protective wrapping paper, and with all accessory tags attached.</li>
              <li>Do not use the shoe box as the outer shipping box; please pack it inside a protective courier bag or brown carton.</li>
              <li>Proof of purchase (Order Number or packing slip receipt) must be provided.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-navy)] mb-3">
              How to Initiate a Return or Exchange
            </h2>
            <div className="space-y-3 text-xs">
              <p>
                <strong>Step 1: Contact Concierge Support</strong><br />
                Reach out to us at <a href="mailto:concierge@abxv.com" className="font-semibold underline">concierge@abxv.com</a> or message our helpline with your <strong>Order Number</strong> and reason for exchange (e.g. need size EU 43 instead of EU 42).
              </p>
              <p>
                <strong>Step 2: Courier Drop-off / Pickup</strong><br />
                For Kathmandu Valley customers, we can arrange a direct home pickup. For outer district and international orders, you will be provided with our regional return facility address.
              </p>
              <p>
                <strong>Step 3: Quality Inspection &amp; Refund</strong><br />
                Once received, our warehouse team conducts a quality check within 2 business days. Approved refunds are credited directly back to the original payment method (Stripe card or Khalti wallet) or bank transfer for COD orders.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream)]/50 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-xs text-[var(--color-navy)]">Have questions about an existing order?</p>
              <p className="text-[11px] text-[var(--color-navy)]/60">Our advisors are available 6 days a week.</p>
            </div>
            <Link
              href={"/contact" as any}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--color-navy)] px-4 py-2.5 text-xs font-semibold text-[var(--color-cream)] hover:bg-[var(--color-navy)]/90 transition-colors shrink-0"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
