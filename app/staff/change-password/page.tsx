"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";
import { performLogout } from "@/lib/auth/logout";

export default function StaffChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password cannot be the same as your temporary access code.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/staff/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      setSuccess(true);
      // Wait briefly then log out and redirect to login
      setTimeout(async () => {
        await performLogout();
        router.push("/staff/login?changed=true" as any);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:px-6">
      <div className="bg-white rounded-2xl border border-[var(--color-sand)] p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-navy)]">
              Set Permanent Password
            </h1>
            <p className="text-xs text-[var(--color-navy)]/60">
              First-time login setup for staff members
            </p>
          </div>
        </div>

        <div className="mb-6 p-3 rounded-lg bg-amber-50/70 border border-amber-200/60 text-xs text-amber-800 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            You logged in with a temporary access code. Please establish a personal, secure password before accessing staff tools.
          </span>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
            {error}
          </div>
        )}

        {success ? (
          <div className="p-6 text-center rounded-xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h3 className="font-semibold text-emerald-900 mb-1">
              Password Changed Successfully!
            </h3>
            <p className="text-xs text-emerald-700">
              Redirecting you to sign in with your new credentials...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-navy)] uppercase tracking-wider mb-1">
                Current Temporary Access Code
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter the code provided by admin"
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-sand)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-navy)] uppercase tracking-wider mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-sand)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-navy)] uppercase tracking-wider mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-sand)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[var(--color-navy)] text-white text-sm font-semibold hover:bg-[var(--color-navy)]/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Updating..." : "Save Password & Sign In"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
