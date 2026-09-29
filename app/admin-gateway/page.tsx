import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import AdminLoginForm from "./AdminLoginForm";

export const metadata: Metadata = {
  title: "ABXV Portal",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
    },
  },
};

export default async function AdminGatewayPage() {
  const configuredAdminPath = process.env.ADMIN_LOGIN_PATH?.trim();
  const headersList = await headers();
  const hasProxyAccess = headersList.get("x-admin-gateway-access") === "true";

  // If ADMIN_LOGIN_PATH is missing/empty, or not routed via proxy rewrite, return 404
  if (!configuredAdminPath || !hasProxyAccess) {
    notFound();
  }

  return <AdminLoginForm />;
}
