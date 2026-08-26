"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function AdminLoginForm() {
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
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-4">
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
        {errors.password && (
          <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      {serverError && (
        <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {serverError}
        </div>
      )}

      <Button type="submit" disabled={loading} size="lg" className="mt-2">
        {loading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}
