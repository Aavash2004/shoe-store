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
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
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
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
              className="flex items-center gap-1.5 text-sm font-medium text-navy"
            >
              Sign Out <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}