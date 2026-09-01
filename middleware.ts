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

  // Redirect legacy /auth/login to /login
  if (pathname === "/auth/login") {
    const loginUrl = new URL("/login", req.url);
    req.nextUrl.searchParams.forEach((val, key) => {
      loginUrl.searchParams.set(key, val);
    });
    return NextResponse.redirect(loginUrl, { headers: requestHeaders });
  }

  // Customer login route handling (/login)
  if (pathname === "/login") {
    if (isLoggedIn) {
      if (userRole === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", req.url), {
          headers: requestHeaders,
        });
      }
      return NextResponse.redirect(new URL("/account", req.url), {
        headers: requestHeaders,
      });
    }
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Customer account routes handling (/account, /account/*)
  if (pathname.startsWith("/account")) {
    // Sub-routes (/account/orders, /account/profile, etc.) require CUSTOMER session
    if (pathname !== "/account") {
      if (!isLoggedIn || userRole !== "CUSTOMER") {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl, { headers: requestHeaders });
      }
    }
  }

  // Admin routes protection (/admin/*)
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      if (isLoggedIn && userRole === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", req.url), {
          headers: requestHeaders,
        });
      }
      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }

    if (!isLoggedIn || userRole !== "ADMIN") {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl, { headers: requestHeaders });
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};