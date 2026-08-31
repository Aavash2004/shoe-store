"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/stores/cart-store";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function CustomerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/account";

  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const cartItems = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const [isAdminAttempt, setIsAdminAttempt] = useState(false);

  async function onSubmit(data: LoginForm) {
    setServerError("");
    setIsAdminAttempt(false);
    setLoading(true);

    const res = await signIn("credentials", {
      email: data.email.trim().toLowerCase(),
      password: data.password,
      loginType: "customer",
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      // Auth.js v5 surfaces CredentialsSignin subclass codes via res.code
      const code = (res as any).code as string | undefined;
      if (code === "admin_use_admin_login") {
        setIsAdminAttempt(true);
        setServerError("Administrator accounts must use the admin login.");
      } else {
        setServerError("Invalid email or password.");
      }
      return;
    }

    if (cartItems.length > 0) {
      await fetch("/api/cart/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });
      clearCart();
    }

    window.location.href = callbackUrl;
  }

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-2">
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10 lg:order-2 lg:py-16">
        {/* Mobile-only compact image strip */}
        <div className="relative mb-8 h-40 w-full max-w-sm overflow-hidden rounded-2xl lg:hidden">
          <Image
            src="/images/Shoes/so4.avif"
            alt="Featured shoe"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-navy/10 to-transparent" />
          <div className="absolute bottom-3 left-4">
            <Link
              href="/"
              className="font-[family-name:var(--font-display)] text-2xl text-white"
            >
              Shoe Store
            </Link>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="mt-8 font-[family-name:var(--font-display)] text-3xl text-navy">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-navy/60">
            Sign in to continue shopping.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-navy/60">
                Email
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                className="mt-1.5 h-11 border-sand bg-cream-alt/60 px-4 text-navy placeholder:text-navy/35 focus-visible:ring-accent"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium uppercase tracking-wider text-navy/60">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-navy/45 hover:text-accent"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("password")}
                  className="h-11 border-sand bg-cream-alt/60 px-4 pr-11 text-navy placeholder:text-navy/35 focus-visible:ring-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/45 hover:text-navy"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 font-medium space-y-2">
                <p>{serverError}</p>
                {isAdminAttempt && (
                  <div>
                    <Link
                      href="/admin/login"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-navy text-cream rounded-md text-xs font-semibold hover:bg-navy/90 transition-colors"
                    >
                      Go to Admin Login →
                    </Link>
                  </div>
                )}
              </div>
            )}

            <Button type="submit" disabled={loading} size="lg" className="mt-2">
              {loading ? "Signing in..." : "Log In"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-navy/60">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="font-medium text-accent hover:underline">
              Create one
            </Link>
          </p>

          {/* Subtle Admin Access Link */}
          <div className="mt-6 text-center text-xs text-navy/40">
            <Link href="/admin/login" className="hover:text-navy hover:underline transition-colors">
              Admin access
            </Link>
          </div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-navy lg:order-1 lg:block">
        <Image
          src="/images/Shoes/so4.avif"
          alt="Featured shoe"
          fill
          className="object-cover opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-end p-12">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cream/60">
            Shoe Store
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-cream">
            Good to see you again.
          </h2>
          <p className="mt-3 max-w-sm text-sm text-cream/70">
            Log in to pick up right where you left off.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream flex items-center justify-center text-xs font-semibold text-navy/60">Loading...</div>}>
      <CustomerLoginForm />
    </Suspense>
  );
}
