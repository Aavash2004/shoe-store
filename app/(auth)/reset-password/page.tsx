"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const resetPasswordFormSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordFormSchema>;

function ResetPasswordFormInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordFormSchema),
    mode: "onChange",
  });

  if (!token) {
    return (
      <div className="space-y-6 rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-rose-950">Invalid Reset Link</h2>
          <p className="mt-1 text-xs text-rose-800">
            This password reset link is missing a security token or has expired.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center justify-center rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-cream hover:bg-navy/90 transition-colors"
        >
          Request New Reset Link
        </Link>
      </div>
    );
  }

  async function onSubmit(data: ResetPasswordForm) {
    setLoading(true);
    setServerError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: data.password,
          confirmPassword: data.confirmPassword,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setServerError(result.error || "Unable to reset password.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {success ? (
        <div className="space-y-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-emerald-950">
              Password Reset Successful!
            </h2>
            <p className="mt-1 text-xs text-emerald-800">
              Your password has been updated. Redirecting you to sign in...
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-cream hover:bg-navy/90 transition-colors"
          >
            Sign In Now
          </Link>
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
              New Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                {...register("password")}
                className="h-11 border-sand bg-cream-alt/60 px-4 pr-11 text-navy placeholder:text-navy/35 focus-visible:ring-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-rose-600">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-navy/80">
              Confirm New Password
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                {...register("confirmPassword")}
                className="h-11 border-sand bg-cream-alt/60 px-4 pr-11 text-navy placeholder:text-navy/35 focus-visible:ring-accent"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy transition-colors cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-rose-600">{errors.confirmPassword.message}</p>
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
                <span>Updating Password...</span>
              </>
            ) : (
              <span>Reset Password</span>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
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
            Security &amp; Privacy
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold text-cream">
            Create new credentials.
          </h2>
          <p className="mt-3 max-w-sm text-sm text-cream/70">
            Choose a strong, unique password to safeguard your orders and saved wishlist items.
          </p>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy/5 text-navy mb-4">
              <Lock className="h-6 w-6" />
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-navy">
              Reset your password
            </h1>
            <p className="mt-2 text-sm text-navy/60">
              Please enter and confirm your new account password below.
            </p>
          </div>

          <Suspense fallback={<div className="h-48 w-full animate-pulse bg-cream-alt rounded-2xl" />}>
            <ResetPasswordFormInner />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
