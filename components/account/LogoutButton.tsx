"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await signOut({ callbackUrl: "/" });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Log Out
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h2 className="text-lg font-medium text-navy">Log out?</h2>
            <p className="mt-2 text-sm text-navy/60">
              You&apos;ll need to sign in again to access your account.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={loading}>
                {loading ? "Logging out..." : "Log Out"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
