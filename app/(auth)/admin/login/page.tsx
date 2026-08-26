"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const urlError = searchParams.get("error");

  const [serverError, setServerError] = useState(
    urlError ? "Access denied or invalid credentials." : ""
  );
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  async function onSubmit(data: LoginForm) {
    setServerError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setServerError("Invalid email or password.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-2">
      {/* Form side */}
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10 lg:order-2 lg:py-16">
        {/* Mobile-only compact image strip */}
        <div className="relative mb-8 h-40 w-full max-w-sm overflow-hidden rounded-2xl lg:hidden">
          <Image
            src="/images/Shoes/so3.avif"
            alt="Featured shoe"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-navy/10 to-transparent" />
          <div className="absolute bottom-3 left-4 flex items-center gap-2">
            <Link
              href="/"
              className="font-[family-name:var(--font-display)] text-2xl text-white"
            >
              Shoe Store
            </Link>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="mt-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy/10">
              <Shield className="h-5 w-5 text-navy" />
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl text-navy">
                Admin Access
              </h1>
            </div>
          </div>
          <p className="mt-2 text-sm text-navy/60">
            Sign in to manage your store.
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-8 flex flex-col gap-4"
          >
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-navy/60">
                Email
              </label>
              <Input
                type="email"
                placeholder="admin@shoestore.com"
                {...register("email")}
                className="mt-1.5 h-11 border-sand bg-cream-alt/60 px-4 text-navy placeholder:text-navy/35 focus-visible:ring-accent"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-navy/60">
                Password
              </label>
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
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            {serverError && (
              <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="mt-2"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-navy/60">
            <Link
              href="/auth/login"
              className="font-medium text-accent hover:underline"
            >
              Sign in as customer instead
            </Link>
          </p>
        </div>
      </div>

      {/* Hero side */}
      <div className="relative hidden overflow-hidden bg-navy lg:order-1 lg:block">
        <Image
          src="/images/Shoes/so3.avif"
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
            Manage your store.
          </h2>
          <p className="mt-3 max-w-sm text-sm text-cream/70">
            Access the admin dashboard to oversee products, orders, and
            inventory.
          </p>
        </div>
      </div>
    </div>
  );
}
