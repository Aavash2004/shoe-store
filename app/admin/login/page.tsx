"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { adminLoginSchema, AdminLoginInput } from "@/lib/validations/auth";
import { ShieldCheck, Lock, Mail, AlertCircle, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const errorParam = searchParams.get("error");

  const [serverError, setServerError] = useState<string | null>(
    errorParam === "AccessDenied"
      ? "Access denied. Admin privileges required."
      : null
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginInput>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: AdminLoginInput) => {
    setServerError(null);
    try {
      const res = await signIn("credentials", {
        email: data.email.trim().toLowerCase(),
        password: data.password,
        redirect: false,
      });

      if (!res || res.error) {
        setServerError("Invalid email or password.");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setServerError("An unexpected error occurred during authentication.");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-cream)] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-sky)]/20 border border-[var(--color-sky)]/40 text-[var(--color-navy)] shadow-xs mb-2">
            <ShieldCheck className="w-8 h-8 text-[var(--color-navy)]" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--color-navy)]">
            Admin Console
          </h1>
          <p className="text-xs text-[var(--color-navy)]/60 uppercase tracking-widest font-semibold">
            Authorized management access only
          </p>
        </div>

        {/* Card */}
        <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-6 sm:p-8 shadow-md space-y-6">
          {serverError && (
            <div
              role="alert"
              className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-5"
          >
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="admin-email"
                className="block text-xs font-semibold uppercase text-[var(--color-navy)]/70"
              >
                Admin Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-navy)]/50">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "admin-email-error" : undefined}
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-3 bg-[var(--color-cream)] border border-[var(--color-sand)] rounded-xl text-sm text-[var(--color-navy)] placeholder-[var(--color-navy)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)] transition-all disabled:opacity-50"
                  placeholder="admin@shoestore.com"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p id="admin-email-error" className="text-xs text-rose-600 font-medium">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold uppercase text-[var(--color-navy)]/70"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-navy)]/50">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "admin-password-error" : undefined}
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-3 bg-[var(--color-cream)] border border-[var(--color-sand)] rounded-xl text-sm text-[var(--color-navy)] placeholder-[var(--color-navy)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)] transition-all disabled:opacity-50"
                  placeholder="••••••••••••"
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p id="admin-password-error" className="text-xs text-rose-600 font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-[var(--color-navy)] hover:bg-[var(--color-navy)]/90 text-[var(--color-cream)] font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)] disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In to Admin Console</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-[var(--color-navy)]/60">
          Protected area. Unauthorized access attempts are monitored and logged.
        </p>
      </div>
    </div>
  );
}
