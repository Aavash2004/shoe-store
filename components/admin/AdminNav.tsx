"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Menu, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/users", label: "Users" },
];

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await signOut({ callbackUrl: "/admin/login" });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-sand bg-cream/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-extrabold tracking-wider text-navy">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-transparent">
              <Image
                src="/images/Shoes/logo.png"
                alt="ABXV Sneaker Logo"
                fill
                className="object-contain"
              />
            </div>
            <span>ABXV</span>
          </Link>
          <span className="rounded-full bg-[var(--color-navy)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]">
            Admin
          </span>
        </div>


        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative pb-1 text-sm font-medium transition-colors ${active
                  ? "text-navy after:absolute after:-bottom-[1px] after:left-0 after:h-px after:w-full after:bg-navy"
                  : "text-navy/55 hover:text-navy"
                  }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop right side */}
        <div className="hidden items-center gap-4 md:flex">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-navy hover:text-accent"
          >
            Sign Out <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-navy md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile panel */}
      <div
        className={`overflow-hidden border-t border-sand bg-cream transition-[max-height,opacity] duration-300 ease-in-out md:hidden ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
      >
        <nav className="flex flex-col px-6 py-2">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`border-b border-sand/60 py-3 text-sm font-medium last:border-b-0 ${active ? "text-navy" : "text-navy/60"
                  }`}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="flex items-center justify-between py-3">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-navy"
            >
              Sign Out <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </nav>
      </div>

      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="max-w-[400px] gap-0 overflow-hidden rounded-lg border border-[#1E2A38]/10 bg-[var(--color-cream)] p-0 shadow-lg">
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

          <div className="flex items-center justify-end gap-2 border-t border-[#1E2A38]/10 bg-[var(--color-cream-alt)] px-6 py-3.5">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              disabled={loading}
              className="h-9 rounded-md px-4 text-[13px] font-medium text-[#1E2A38]/60 transition hover:text-[#1E2A38] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className="h-9 rounded-md bg-rose-600 px-4 text-[13px] font-medium text-white transition hover:bg-rose-700 disabled:opacity-60"
            >
              {loading ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}