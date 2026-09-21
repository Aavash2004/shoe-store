"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, Mail, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const [debugUrl, setDebugUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onChange",
  });

  async function onSubmit(data: ForgotPasswordForm) {
    setLoading(true);
    setServerError("");
    setDebugUrl(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setServerError(result.error || "Unable to process request.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
      if (result.debugResetUrl) {
        setDebugUrl(result.debugResetUrl);
      }
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-2">
      {/* Visual Side */}
      <div className="relative hidden overflow-hidden bg-navy lg:block">
        <Image
          src="/images/Shoes/dd.jpg"
          alt="Footwear craftsmanship"
          fill
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/50 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-end p-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cream/60">
            Account Recovery
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold text-cream">
            Reset your access.
          </h2>
          <p className="mt-3 max-w-sm text-sm text-cream/70">
            Enter your email and we will send you verified steps to securely restore access to your ABXV account.
          </p>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy/60 hover:text-navy transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Login</span>
            </Link>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy/5 text-navy mb-4">
              <KeyRound className="h-6 w-6" />
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-navy">
              Forgot password?
            </h1>
            <p className="mt-2 text-sm text-navy/60">
              No worries, enter your account email and we&apos;ll send you a password reset link.
            </p>
          </div>

          {submitted ? (
            <div className="space-y-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-emerald-950">
                    Check your email
                  </h3>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    If an account matches that email address, password reset instructions have been dispatched. The reset link is valid for 60 minutes.
                  </p>
                </div>
              </div>

              {debugUrl && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs">
                  <p className="font-bold text-amber-900 mb-1">
                    [Development Mode Preview]
                  </p>
                  <p className="text-amber-800 mb-2">
                    Direct password reset link:
                  </p>
                  <Link
                    href={debugUrl}
                    className="font-mono text-[11px] text-blue-700 underline break-all hover:text-blue-900"
                  >
                    {debugUrl}
                  </Link>
                </div>
              )}

              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-navy px-4 py-3 text-xs font-semibold text-cream hover:bg-navy/90 transition-colors"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {serverError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700">
                  {serverError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-navy/80">
                  Email Address
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    {...register("email")}
                    className="h-11 border-sand bg-cream-alt/60 pl-10 pr-4 text-navy placeholder:text-navy/35 focus-visible:ring-accent"
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-navy/40" />
                </div>
                {errors.email && (
                  <p className="text-xs text-rose-600">{errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-navy text-xs font-bold uppercase tracking-wider text-cream shadow-xs hover:bg-navy/90 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
