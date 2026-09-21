import { Metadata } from "next";
import { Truck, Globe, Clock, ShieldCheck, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy — ABXV",
  description: "Learn about ABXV domestic Nepal and worldwide express shipping options, free delivery thresholds, and delivery timelines.",
};

export default function ShippingPolicyPage() {
  return (
    <main className="min-h-screen bg-[var(--color-cream)] text-[var(--color-navy)] pb-24">
      {/* Header */}
      <section className="mx-auto max-w-4xl px-6 pt-12 pb-8 text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-navy)]/55 block">
          LOGISTICS &amp; FULFILLMENT
        </span>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-extrabold text-[var(--color-navy)]">
          Shipping Policy
        </h1>
        <p className="mt-3 text-sm text-[var(--color-navy)]/65 max-w-lg mx-auto leading-relaxed">
          Transparent, reliable, and trackable delivery worldwide. Learn about dispatch times, courier partners, and free shipping criteria.
        </p>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-4xl px-6 mt-6 space-y-8">
        {/* Highlight Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-5 text-center shadow-2xs">
            <Truck className="h-6 w-6 text-[var(--color-navy)] mx-auto mb-2" />
            <h3 className="font-bold text-sm text-[var(--color-navy)]">Free Domestic Delivery</h3>
            <p className="text-xs text-[var(--color-navy)]/60 mt-1">On orders over Rs. 15,000 in Nepal</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-5 text-center shadow-2xs">
            <Clock className="h-6 w-6 text-[var(--color-navy)] mx-auto mb-2" />
            <h3 className="font-bold text-sm text-[var(--color-navy)]">1–3 Day Kathmandu Valley</h3>
            <p className="text-xs text-[var(--color-navy)]/60 mt-1">Fast regional courier dispatch</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-5 text-center shadow-2xs">
            <Globe className="h-6 w-6 text-[var(--color-navy)] mx-auto mb-2" />
            <h3 className="font-bold text-sm text-[var(--color-navy)]">International Express</h3>
            <p className="text-xs text-[var(--color-navy)]/60 mt-1">US &amp; UK via DHL / FedEx (5–7 days)</p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="rounded-3xl border border-[var(--color-sand)] bg-white p-8 sm:p-10 shadow-xs space-y-8 text-xs sm:text-sm text-[var(--color-navy)]/80 leading-relaxed">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-navy)] mb-3">
              1. Domestic Shipping Rates &amp; Schedules (Nepal)
            </h2>
            <p>
              We deliver to all major municipalities and provinces across Nepal. All orders are packed in temperature-controlled facilities and dispatched in signature dual-box packaging to guarantee pristine arrival.
            </p>
            <div className="mt-4 overflow-hidden rounded-xl border border-[var(--color-sand)]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--color-cream-alt)] text-[10px] font-bold uppercase text-[var(--color-navy)]/70">
                  <tr>
                    <th className="p-3">Destination</th>
                    <th className="p-3">Standard Fee</th>
                    <th className="p-3">Estimated Transit</th>
                    <th className="p-3">Free Shipping Threshold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-sand)]/70">
                  <tr>
                    <td className="p-3 font-semibold">Kathmandu, Lalitpur, Bhaktapur</td>
                    <td className="p-3">Rs. 150</td>
                    <td className="p-3">1–2 Business Days</td>
                    <td className="p-3 text-emerald-700 font-bold">Rs. 15,000+</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Major Regional Cities (Pokhara, Biratnagar, Chitwan)</td>
                    <td className="p-3">Rs. 250</td>
                    <td className="p-3">2–4 Business Days</td>
                    <td className="p-3 text-emerald-700 font-bold">Rs. 15,000+</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Outer District Centers</td>
                    <td className="p-3">Rs. 350</td>
                    <td className="p-3">3–6 Business Days</td>
                    <td className="p-3 text-emerald-700 font-bold">Rs. 20,000+</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-navy)] mb-3">
              2. International Shipments (US &amp; UK)
            </h2>
            <p>
              International deliveries are shipped via air express couriers (DHL Express and FedEx). Shipping fees are dynamically calculated at checkout based on destination country rules and exchange rates.
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1.5 text-xs text-[var(--color-navy)]/75">
              <li><strong>United States:</strong> Flat rate of $25.00 USD. Free delivery on orders exceeding $150.00 USD.</li>
              <li><strong>United Kingdom:</strong> Flat rate of £20.00 GBP. Free delivery on orders exceeding £120.00 GBP.</li>
              <li>All international shipments are sent <strong>DDU (Delivered Duty Unpaid)</strong>. Destination import duties and VAT, if applicable by local customs authorities, are the recipient&apos;s responsibility.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-navy)] mb-3">
              3. Order Tracking &amp; Notifications
            </h2>
            <p>
              Once your package is verified and dispatched from our fulfillment depot, you will receive a tracking link. You can track your parcel in real-time at any moment by navigating to our dedicated <a href="/track-order" className="text-[var(--color-navy)] font-bold underline hover:text-[var(--color-sky)]">Order Tracking Portal</a> with your order number.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
