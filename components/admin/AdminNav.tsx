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
  { href: "/admin/reviews", label: "Reviews" },
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
    <header className="sticky top-0 z-50 border-b border-[var(--color-sand)] bg-[var(--color-cream)]/95 backdrop-blur-md shadow-2xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">
        {/* Left: Brand + Enhanced Admin Badge */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 font-[family-name:var(--font-display)] text-lg font-extrabold tracking-wider text-[var(--color-navy)] transition-opacity hover:opacity-90"
          >
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-xl bg-[var(--color-cream-alt)] p-1 border border-[var(--color-sand)] shadow-2xs">
              <Image
                src="/images/Shoes/logo.png"
                alt="ABXV Logo"
                fill
                className="object-contain p-0.5"
              />
            </div>
            <span className="tracking-tight">ABXV</span>
          </Link>

          {/* Polished Admin Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-sand)] bg-[var(--color-cream-alt)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-navy)] shadow-2xs">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            </span>
            Admin
          </span>
        </div>

        {/* Desktop nav (uses lg:flex to ensure 868px screens don't get squished) */}
        <nav className="hidden items-center gap-5 xl:gap-7 lg:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href as any}
                className={`relative py-1 text-xs xl:text-sm font-semibold transition-colors duration-150 ${
                  active
                    ? "text-[var(--color-navy)] font-bold after:absolute after:-bottom-[2px] after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-[var(--color-navy)]"
                    : "text-[var(--color-navy)]/60 hover:text-[var(--color-navy)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop right side: Polished Sign Out Button */}
        <div className="hidden items-center gap-3 lg:flex">
          {email && (
            <span className="hidden xl:inline-block text-[11px] font-medium text-[var(--color-navy)]/45 max-w-[150px] truncate">
              {email}
            </span>
          )}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-sand)] bg-[var(--color-cream-alt)] px-3 py-1.5 text-xs font-semibold text-[var(--color-navy)]/80 transition-all duration-150 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-95 shadow-2xs"
            title={`Signed in as ${email}`}
          >
            <span>Sign Out</span>
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Mobile/Tablet toggle button (active on < lg screens like 868px) */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-2 text-[var(--color-navy)] transition-colors hover:bg-[var(--color-sand)]/30 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile/Tablet panel (clean, un-congested drawer) */}
      <div
        className={`overflow-hidden border-t border-[var(--color-sand)] bg-[var(--color-cream)] transition-[max-height,opacity] duration-300 ease-in-out lg:hidden ${
          open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col px-5 py-3 space-y-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href as any}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-[var(--color-navy)] text-[var(--color-cream)]"
                    : "text-[var(--color-navy)]/75 hover:bg-[var(--color-sand)]/30 hover:text-[var(--color-navy)]"
                }`}
              >
                <span>{link.label}</span>
                {active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-sky)]" />
                )}
              </Link>
            );
          })}

          {/* User profile & Un-congested Sign Out Card */}
          <div className="mt-3 border-t border-[var(--color-sand)] pt-3 pb-1">
            <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-[var(--color-cream-alt)] border border-[var(--color-sand)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-navy)] text-[11px] font-bold text-[var(--color-cream)]">
                  {email ? email.charAt(0).toUpperCase() : "A"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--color-navy)] leading-tight">
                    Admin
                  </p>
                  <p className="text-[11px] text-[var(--color-navy)]/55 truncate">
                    {email || "admin@shoestore.com"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  setShowLogoutConfirm(true);
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 active:scale-95"
              >
                <span>Sign Out</span>
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
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