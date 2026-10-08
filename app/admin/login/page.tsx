import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import AdminLoginForm from "./AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin Sign In | ABXV",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLoginPage() {
  const rawAdminLoginPath = process.env.ADMIN_LOGIN_PATH?.trim() || "/admin/login";
  const adminLoginPath =
    rawAdminLoginPath && rawAdminLoginPath.startsWith("/")
      ? rawAdminLoginPath
      : `/${rawAdminLoginPath}`;

  const headersList = await headers();
  const isAllowed =
    headersList.get("x-admin-login-allowed") === "true" ||
    adminLoginPath === "/admin/login";

  if (!isAllowed) {
    notFound();
  }

  return <AdminLoginForm />;
}
