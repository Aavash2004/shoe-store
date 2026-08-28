"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { adminLoginSchema, AdminLoginInput } from "@/lib/validations/auth";
import { ShieldCheck, Lock, Mail, AlertCircle, Loader2 } from "lucide-react";

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const errorParam = searchParams.get("error");

  const [serverError, setServerError] = useState<string | null>(
    errorParam === "AccessDenied" || errorParam === "UnauthorizedAdmin"
      ? "Unauthorized admin account"
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
        loginType: "admin",
        redirect: false,
      });

      if (res?.error) {
        if (
          res.error.includes("Unauthorized admin account") ||
          (res as any).code === "Unauthorized admin account"
        ) {
          setServerError("Unauthorized admin account");
        } else {
          setServerError("Invalid email or password.");
        }
        return;
      }

      // Hard navigate to ensure new session cookies are sent to middleware & layout
      window.location.href = callbackUrl;
    } catch (err: any) {
      if (err?.message?.includes("NEXT_REDIRECT")) {
        window.location.href = callbackUrl;
        return;
      }
      const msg = err?.message || "";
      if (msg.includes("Unauthorized admin account")) {
        setServerError("Unauthorized admin account");
      } else {
        setServerError("Invalid email or password.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2EB] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 text-[#1E2A38]">
      <div className="w-full max-w-md space-y-8">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#89B4D9]/20 border border-[#89B4D9]/40 text-[#1E2A38] shadow-xs mb-2">
            <ShieldCheck className="w-8 h-8 text-[#1E2A38]" />
          </div>
          <p className="text-xs text-[#1E2A38]/60 uppercase tracking-[0.25em] font-semibold">
            ADMINISTRATOR
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[#1E2A38]">
            Shoe Store Admin
          </h1>
        </div>

        {/* Card */}
        <div className="bg-[#EFECE6] border border-[#1E2A38]/15 rounded-2xl p-6 sm:p-8 shadow-md space-y-6">
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
                className="block text-xs font-semibold uppercase tracking-wider text-[#1E2A38]/70"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#1E2A38]/50">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "admin-email-error" : undefined}
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-3 bg-[#F5F2EB] border border-[#1E2A38]/20 rounded-xl text-sm text-[#1E2A38] placeholder-[#1E2A38]/40 focus:outline-none focus:ring-2 focus:ring-[#89B4D9] transition-all disabled:opacity-50"
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
                className="block text-xs font-semibold uppercase tracking-wider text-[#1E2A38]/70"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#1E2A38]/50">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "admin-password-error" : undefined}
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-3 bg-[#F5F2EB] border border-[#1E2A38]/20 rounded-xl text-sm text-[#1E2A38] placeholder-[#1E2A38]/40 focus:outline-none focus:ring-2 focus:ring-[#89B4D9] transition-all disabled:opacity-50"
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
              className="w-full py-3.5 px-4 bg-[#1E2A38] hover:bg-[#1E2A38]/90 text-[#F5F2EB] font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#89B4D9] disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-[#1E2A38]/50">
          Shoe Store Administration Interface
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center text-xs font-semibold text-[#1E2A38]/60">
          Loading...
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
