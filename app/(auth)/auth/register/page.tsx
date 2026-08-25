"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const registerSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .regex(/^[A-Za-z\s]+$/, "Name can only contain letters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Must be at least 8 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  });

  async function onSubmit(data: RegisterForm) {
    setServerError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setLoading(false);

    if (!res.ok) {
      const result = await res.json();
      setServerError(result.error ?? "Something went wrong");
      return;
    }

    router.push("/auth/login");
  }

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-2">
      {/* Visual side */}
      <div className="relative hidden overflow-hidden bg-navy lg:block">
        <Image
          src="/images/Shoes/dd.jpg"
          alt="Featured shoe"
          fill
          className="object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-end p-12">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cream/60">
            Shoe Store
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-cream">
            Join the collection.
          </h2>
          <p className="mt-3 max-w-sm text-sm text-cream/70">
            Create an account to save favorites, track orders, and check out faster.
          </p>
        </div>
      </div>

      {/* Form side */}
     <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10 lg:py-16">
  {/* Mobile-only compact image strip */}
  <div className="relative mb-8 h-40 w-full max-w-sm overflow-hidden rounded-2xl lg:hidden">
    <Image
      src="/images/Shoes/so3.avif"
      alt="Featured shoe"
      fill
      className="object-cover"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-navy/10 to-transparent" />
    <div className="absolute bottom-3 left-4">
      <p className="font-[family-name:var(--font-display)] text-xl text-cream">
        Join the collection.
      </p>
    </div>
  </div>

  <div className="w-full max-w-sm">
    <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-2xl text-navy"
          >
            Shoe Store
          </Link>

          <h1 className="mt-8 font-[family-name:var(--font-display)] text-3xl text-navy">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-navy/60">
            It only takes a minute.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-navy/60">
                Full Name
              </label>
              <Input
                placeholder="John Doe"
                {...register("name")}
                className="mt-1.5 h-11 border-sand bg-cream-alt/60 px-4 text-navy placeholder:text-navy/35 focus-visible:ring-accent"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>

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
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password ? (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              ) : (
                <p className="mt-1 text-xs text-navy/40">At least 8 characters</p>
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
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-navy/60">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-accent hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}