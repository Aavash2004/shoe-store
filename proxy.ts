import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/auth.config";
import { sanitizeCallbackUrl } from "@/lib/auth/authorization";

const { auth } = NextAuth(authConfig);

const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;
  const userEmail = req.auth?.user?.email?.trim().toLowerCase();
  const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  // User must have ADMIN role; if ADMIN_EMAIL is set in env, it must match
  const isAdmin =
    isLoggedIn &&
    userRole === "ADMIN" &&
    (!configuredAdminEmail || (!!userEmail && userEmail === configuredAdminEmail));

  // Redirect legacy /auth/login to /login
  if (pathname === "/auth/login") {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    req.nextUrl.searchParams.forEach((val, key) => {
      loginUrl.searchParams.set(key, val);
    });
    return NextResponse.redirect(loginUrl, { headers: requestHeaders });
  }

  // Customer login route handling (/login)
  if (pathname === "/login") {
    if (isLoggedIn) {
      if (isAdmin) {
        return NextResponse.redirect(new URL("/admin", req.nextUrl.origin), {
          headers: requestHeaders,
        });
      }
      const rawCallbackUrl = req.nextUrl.searchParams.get("callbackUrl");
      const target = sanitizeCallbackUrl(rawCallbackUrl, {
        allowAdmin: false,
        fallback: "/account",
      });
      return NextResponse.redirect(new URL(target, req.nextUrl.origin), {
        headers: requestHeaders,
      });
    }
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Customer account routes handling (/account, /account/*)
  if (pathname.startsWith("/account")) {
    // Sub-routes (/account/orders, /account/profile, etc.) require logged in session
    if (pathname !== "/account") {
      if (!isLoggedIn) {
        const loginUrl = new URL("/login", req.nextUrl.origin);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl, { headers: requestHeaders });
      }
    }
  }

  // Admin routes protection (/admin, /admin/*)
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      if (isAdmin) {
        return NextResponse.redirect(new URL("/admin", req.nextUrl.origin), {
          headers: requestHeaders,
        });
      }
      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }

    if (!isLoggedIn) {
      // Unauthenticated requests to /admin redirect to /admin/login
      const loginUrl = new URL("/admin/login", req.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl, { headers: requestHeaders });
    }

    if (!isAdmin) {
      // Normal authenticated users visiting /admin must be blocked
      const blockedUrl = new URL("/", req.nextUrl.origin);
      blockedUrl.searchParams.set("error", "AccessDenied");
      return NextResponse.redirect(blockedUrl, { headers: requestHeaders });
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export default proxy;

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|bmp|tiff|woff|woff2|ttf|eot)).*)",
  ],
};