"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password: code,
        loginType: "staff",
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "locked_out" || result.code === "locked_out") {
          setError("Too many failed attempts. Please wait 15 minutes.");
        } else {
          // Same generic message for all failure cases
          setError("Invalid credentials.");
        }
        return;
      }

      if (result?.ok) {
        router.push("/staff/orders" as any);
        router.refresh();
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-cream)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-navy)] text-white mb-4">
            <Package className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-navy)] tracking-tight">
            Staff Portal
          </h1>
          <p className="text-sm text-[var(--color-navy)]/50 mt-1">
            Fulfillment & Inventory
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="staff-email"
              className="block text-sm font-semibold text-[var(--color-navy)] mb-1.5"
            >
              Email
            </label>
            <input
              id="staff-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-sand)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-navy)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)] focus:border-transparent transition-shadow"
              placeholder="staff@store.com"
            />
          </div>

          <div>
            <label
              htmlFor="staff-code"
              className="block text-sm font-semibold text-[var(--color-navy)] mb-1.5"
            >
              Access Code
            </label>
            <input
              id="staff-code"
              type="password"
              required
              autoComplete="current-password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-sand)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-navy)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)] focus:border-transparent transition-shadow font-mono tracking-widest"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-600 font-medium bg-rose-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-[var(--color-navy)] text-white py-2.5 text-sm font-semibold hover:bg-[var(--color-navy)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-[var(--color-navy)]/35 mt-6">
          Contact your store manager for access credentials.
        </p>
      </div>
    </div>
  );
}
