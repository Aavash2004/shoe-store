"use client";

import { useState } from "react";
import { Send, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ContactForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Basic client validation
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!message.trim() || message.trim().length < 5) {
      setError("Please enter your message (at least 5 characters).");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email,
          orderNumber: orderNumber.trim() || undefined,
          message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send message. Please try again.");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again or email us directly.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFullName("");
    setEmail("");
    setOrderNumber("");
    setMessage("");
    setError(null);
    setSuccess(false);
  }

  if (success) {
    return (
      <div className="rounded-3xl border border-[var(--color-sand)] bg-white p-8 sm:p-10 shadow-xs text-center space-y-5 animate-in fade-in duration-200">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-navy)]">
            Inquiry Submitted Successfully!
          </h3>
          <p className="text-sm text-[var(--color-navy)]/70 max-w-md mx-auto leading-relaxed">
            Thank you, <strong className="text-[var(--color-navy)]">{fullName}</strong>. Your message has been routed to our customer support team. We will review your inquiry and follow up at <strong className="text-[var(--color-navy)]">{email}</strong> within 24 business hours.
          </p>
        </div>

        <div className="pt-2">
          <Button
            type="button"
            onClick={handleReset}
            variant="outline"
            className="rounded-xl border-[var(--color-sand)] text-xs font-semibold text-[var(--color-navy)] hover:bg-[var(--color-sand)]/30"
          >
            <span>Send Another Inquiry</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[var(--color-sand)] bg-white p-6 sm:p-8 shadow-xs space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-navy)]">
          Send a Message
        </h2>
        <p className="text-xs text-[var(--color-navy)]/60 mt-1">
          Leave your details and our footwear specialists will respond within 24 business hours.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs font-medium text-rose-700 animate-in fade-in duration-150">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="contact-name" className="text-xs font-semibold text-[var(--color-navy)]/80">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <Input
              id="contact-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Jane Doe"
              disabled={loading}
              className="h-11 border-[var(--color-sand)] bg-[var(--color-cream)]/40 text-xs focus-visible:ring-1 focus-visible:ring-[var(--color-navy)]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="contact-email" className="text-xs font-semibold text-[var(--color-navy)]/80">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <Input
              id="contact-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. jane@example.com"
              disabled={loading}
              className="h-11 border-[var(--color-sand)] bg-[var(--color-cream)]/40 text-xs focus-visible:ring-1 focus-visible:ring-[var(--color-navy)]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="contact-order" className="text-xs font-semibold text-[var(--color-navy)]/80">
            Order Number (Optional)
          </label>
          <Input
            id="contact-order"
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="e.g. ABXV-2026-9812"
            disabled={loading}
            className="h-11 border-[var(--color-sand)] bg-[var(--color-cream)]/40 text-xs focus-visible:ring-1 focus-visible:ring-[var(--color-navy)]"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="contact-message" className="text-xs font-semibold text-[var(--color-navy)]/80">
            Message <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="contact-message"
            rows={4}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="How can our footwear specialists help you today?"
            disabled={loading}
            className="w-full rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream)]/40 p-3.5 text-xs text-[var(--color-navy)] placeholder:text-[var(--color-navy)]/40 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)] transition-colors"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl bg-[var(--color-navy)] text-xs font-bold uppercase tracking-wider text-[var(--color-cream)] hover:bg-[var(--color-navy)]/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Submitting Inquiry...</span>
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              <span>Submit Inquiry</span>
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
