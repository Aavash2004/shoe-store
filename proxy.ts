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

  // Fail closed: User must have ADMIN role and match configured ADMIN_EMAIL
  const isAdmin =
    isLoggedIn &&
    userRole === "ADMIN" &&
    !!configuredAdminEmail &&
    !!userEmail &&
    userEmail === configuredAdminEmail;

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

  const configuredAdminPath = process.env.ADMIN_LOGIN_PATH?.trim();
  const normalizedAdminPath =
    configuredAdminPath && configuredAdminPath.length > 0
      ? configuredAdminPath.startsWith("/")
        ? configuredAdminPath
        : `/${configuredAdminPath}`
      : null;

  // Secret admin login route handling
  if (normalizedAdminPath && pathname === normalizedAdminPath) {
    if (isLoggedIn && isAdmin) {
      return NextResponse.redirect(new URL("/admin", req.nextUrl.origin), {
        headers: requestHeaders,
      });
    }
    requestHeaders.set("x-admin-gateway-access", "true");
    requestHeaders.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    const res = NextResponse.rewrite(new URL("/admin-gateway", req.nextUrl.origin), {
      headers: requestHeaders,
    });
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return res;
  }

  // Block direct access to internal admin-gateway route
  if (pathname === "/admin-gateway" || pathname.startsWith("/admin-gateway/")) {
    return NextResponse.rewrite(new URL("/_not-found", req.nextUrl.origin), {
      status: 404,
      headers: requestHeaders,
    });
  }

  // Ensure old /admin/login permanently returns 404
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.rewrite(new URL("/_not-found", req.nextUrl.origin), {
      status: 404,
      headers: requestHeaders,
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
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!isLoggedIn) {
      // Plain 404 for unauthenticated users so admin area does not reveal itself
      return NextResponse.rewrite(new URL("/_not-found", req.nextUrl.origin), {
        status: 404,
        headers: requestHeaders,
      });
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