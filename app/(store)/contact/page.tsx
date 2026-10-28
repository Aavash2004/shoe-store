import { Metadata } from "next";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us — ABXV",
  description: "Get in touch with ABXV customer service. Reach us via email, phone, or visit our Bhaktapur showroom.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[var(--color-cream)] text-[var(--color-navy)] pb-24">
      {/* Header Banner */}
      <section className="mx-auto max-w-5xl px-6 pt-12 pb-8 text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-navy)]/55 block">
          HELP &amp; SUPPORT
        </span>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-extrabold text-[var(--color-navy)]">
          Contact Us
        </h1>
        <p className="mt-3 text-sm text-[var(--color-navy)]/65 max-w-md mx-auto leading-relaxed">
          Have a question about fit, sizing, shipping, or an existing order? Our concierge team is here to assist you.
        </p>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-5xl px-6 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact Details Card */}
          <div className="md:col-span-1 space-y-6">
            <div className="rounded-3xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-6 space-y-6 shadow-2xs">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)] border-b border-[var(--color-sand)] pb-3">
                Direct Channels
              </h2>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white border border-[var(--color-sand)] text-[var(--color-navy)] shadow-2xs">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--color-navy)]">Email Us</p>
                    <a
                      href="mailto:basnetaavash7@gmail.com"
                      className="text-[var(--color-navy)]/70 hover:underline hover:text-[var(--color-sky)] break-all"
                    >
                      basnetaavash7@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white border border-[var(--color-sand)] text-[var(--color-navy)] shadow-2xs">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--color-navy)]">Customer Helpline</p>
                    <a
                      href="tel:+9779861990722"
                      className="text-[var(--color-navy)]/70 hover:underline hover:text-[var(--color-sky)] font-medium"
                    >
                      +977 9861990722
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white border border-[var(--color-sand)] text-[var(--color-navy)] shadow-2xs">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--color-navy)]">Operating Hours</p>
                    <p className="text-[var(--color-navy)]/70">Sunday – Friday: 9am – 7pm NPT</p>
                    <p className="text-[var(--color-navy)]/50 text-[11px]">Saturday: Closed</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white border border-[var(--color-sand)] text-[var(--color-navy)] shadow-2xs">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--color-navy)]">Showroom &amp; Flagship</p>
                    <p className="text-[var(--color-navy)]/70 font-medium">Bhaktapur, Nepal</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Inquiry Form */}
          <div className="md:col-span-2">
            <ContactForm />
          </div>
        </div>
      </section>
    </main>
  );
}
