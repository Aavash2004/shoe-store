"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

<Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[400px] gap-0 overflow-hidden rounded-lg border border-[#1E2A38]/10 bg-[#F5F2EB] p-0 shadow-lg">
          <div className="px-6 pt-6 pb-5">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="font-[family-name:var(--font-display)] text-[20px] font-semibold tracking-tight text-[#1E2A38]">
                Sign out?
              </DialogTitle>
              <DialogDescription className="text-[13px] leading-relaxed text-[#1E2A38]/60">
                You&apos;ll need to sign in again to access the admin
                dashboard.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#1E2A38]/10 bg-[#EFECE6]/60 px-6 py-3.5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="h-9 rounded-md px-4 text-[13px] font-medium text-[#1E2A38]/60 transition hover:text-[#1E2A38] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="h-9 rounded-md bg-rose-600 px-4 text-[13px] font-medium text-white transition hover:bg-rose-700 disabled:opacity-60"
            >
              {loading ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
