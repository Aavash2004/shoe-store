"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";

export function AdminLogoutButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await signOut({ callbackUrl: "/admin/login" });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-[var(--color-navy)]/65 hover:text-rose-700 transition-colors focus:outline-none focus:underline"
      >
        Sign Out
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h2 className="text-lg font-medium text-[var(--color-navy)]">Sign out?</h2>
            <p className="mt-2 text-sm text-[var(--color-navy)]/60">
              You&apos;ll need to sign in again to access the admin dashboard.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="rounded-md border border-sand px-4 py-2 text-sm text-[var(--color-navy)] hover:bg-cream-alt disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="rounded-md bg-[var(--color-navy)] px-4 py-2 text-sm text-cream hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
