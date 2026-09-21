import { Metadata } from "next";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Contact Us — ABXV",
  description: "Get in touch with ABXV customer service. Reach us via email, phone, or visit our Kathmandu showroom.",
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
                      href="mailto:concierge@abxv.com"
                      className="text-[var(--color-navy)]/70 hover:underline hover:text-[var(--color-sky)]"
                    >
                      concierge@abxv.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white border border-[var(--color-sand)] text-[var(--color-navy)] shadow-2xs">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--color-navy)]">Customer Helpline</p>
                    <p className="text-[var(--color-navy)]/70">+977 (01) 441-2890</p>
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
                    <p className="text-[var(--color-navy)]/70">Durbar Marg, Ward No. 1</p>
                    <p className="text-[var(--color-navy)]/70">Kathmandu 44600, Nepal</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Inquiry Form */}
          <div className="md:col-span-2">
            <div className="rounded-3xl border border-[var(--color-sand)] bg-white p-8 shadow-xs space-y-6">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-navy)]">
                  Send a Message
                </h2>
                <p className="text-xs text-[var(--color-navy)]/60 mt-1">
                  Leave your details and an advisor will respond within 24 business hours.
                </p>
              </div>

              <form className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--color-navy)]/80">
                      Full Name
                    </label>
                    <Input
                      placeholder="Jane Doe"
                      className="h-11 border-[var(--color-sand)] bg-[var(--color-cream)]/40 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--color-navy)]/80">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      placeholder="jane@example.com"
                      className="h-11 border-[var(--color-sand)] bg-[var(--color-cream)]/40 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--color-navy)]/80">
                    Order Number (Optional)
                  </label>
                  <Input
                    placeholder="e.g. ABXV-2026-9812"
                    className="h-11 border-[var(--color-sand)] bg-[var(--color-cream)]/40 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--color-navy)]/80">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    placeholder="How can our footwear specialists help you today?"
                    className="w-full rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream)]/40 p-3.5 text-xs text-[var(--color-navy)] placeholder:text-[var(--color-navy)]/40 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]"
                  />
                </div>

                <Button
                  type="button"
                  className="h-12 w-full rounded-xl bg-[var(--color-navy)] text-xs font-bold uppercase tracking-wider text-[var(--color-cream)] hover:bg-[var(--color-navy)]/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit Inquiry</span>
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
