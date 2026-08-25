"use client";

import { signOut } from "next-auth/react";

export function AdminLogoutButton() {
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/admin/login" });
  };

  return (
    <button
      onClick={handleLogout}
      className="text-xs font-medium text-[var(--color-navy)]/65 hover:text-rose-700 transition-colors focus:outline-none focus:underline"
    >
      Sign Out
    </button>
  );
}
