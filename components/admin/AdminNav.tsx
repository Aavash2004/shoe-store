"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Menu, X } from "lucide-react";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/orders", label: "Orders" },
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
            <div>
            <span className=" text-xs uppercase tracking-wide text-navy-blue/80 ">
            Admin
          </span>
          </div>
          <Link href="/admin" className="font-[family-name:var(--font-display)] text-xl text-navy">
            Shoe Store 
          </Link>
        </div>
        

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative pb-1 text-sm font-medium transition-colors ${
                  active
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
        className={`overflow-hidden border-t border-sand bg-cream transition-[max-height,opacity] duration-300 ease-in-out md:hidden ${
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
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
                className={`border-b border-sand/60 py-3 text-sm font-medium last:border-b-0 ${
                  active ? "text-navy" : "text-navy/60"
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

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h2 className="text-lg font-medium text-[var(--color-navy)]">Sign out?</h2>
            <p className="mt-2 text-sm text-[var(--color-navy)]/60">
              You&apos;ll need to sign in again to access the admin dashboard.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loading}
                className="rounded-md border border-sand px-4 py-2 text-sm text-[var(--color-navy)] hover:bg-cream-alt disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="rounded-md bg-[var(--color-navy)] px-4 py-2 text-sm text-cream hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}