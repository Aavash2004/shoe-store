
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  // Protected admin routes check (excluding /admin/login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!isLoggedIn) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl, { headers: requestHeaders });
    }

    if (userRole !== "ADMIN") {
      // Authenticated non-ADMIN user: redirect to admin login with forbidden error flag
      const forbiddenUrl = new URL("/admin/login?error=AccessDenied", req.url);
      return NextResponse.redirect(forbiddenUrl, { headers: requestHeaders });
    }
  }

  // If already logged in as ADMIN and visiting /admin/login, redirect to /admin
  if (pathname === "/admin/login" && isLoggedIn && userRole === "ADMIN") {
    return NextResponse.redirect(new URL("/admin", req.url), { headers: requestHeaders });
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};