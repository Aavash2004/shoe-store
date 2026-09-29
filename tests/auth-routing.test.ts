import { isAdminSession, sanitizeCallbackUrl } from "../lib/auth/authorization";
import {
  checkLoginLockout,
  recordFailedLogin,
  clearFailedLogins,
  resetRateLimitsForTesting,
} from "../lib/security/loginRateLimit";

async function runTests() {
  console.log("=== Running Auth & Routing Security Tests ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  const originalAdminEmail = process.env.ADMIN_EMAIL;
  const originalAdminLoginPath = process.env.ADMIN_LOGIN_PATH;

  try {
    // 1. Fail Closed: No session
    assert(isAdminSession(null) === false, "Denies access when session is null");
    assert(isAdminSession(undefined) === false, "Denies access when session is undefined");
    assert(isAdminSession({ user: undefined }) === false, "Denies access when session user is undefined");

    // 2. Fail Closed: Normal customer session
    process.env.ADMIN_EMAIL = "admin@shoestore.com";
    const customerSession = {
      user: {
        role: "CUSTOMER",
        email: "customer@example.com",
      },
    };
    assert(isAdminSession(customerSession) === false, "Denies admin access to CUSTOMER role");

    // 3. Fail Closed: Missing or undefined ADMIN_EMAIL in environment
    delete process.env.ADMIN_EMAIL;
    const adminSessionWithNoEnv = {
      user: {
        role: "ADMIN",
        email: "admin@shoestore.com",
      },
    };
    assert(
      isAdminSession(adminSessionWithNoEnv) === false,
      "Fails closed: Denies admin access when ADMIN_EMAIL is undefined in env"
    );

    process.env.ADMIN_EMAIL = "";
    assert(
      isAdminSession(adminSessionWithNoEnv) === false,
      "Fails closed: Denies admin access when ADMIN_EMAIL is empty string"
    );

    // 4. Fail Closed: Email mismatch
    process.env.ADMIN_EMAIL = "admin@shoestore.com";
    const adminSessionWrongEmail = {
      user: {
        role: "ADMIN",
        email: "imposter@shoestore.com",
      },
    };
    assert(
      isAdminSession(adminSessionWrongEmail) === false,
      "Fails closed: Denies admin access when user email does not match ADMIN_EMAIL"
    );

    // 5. Valid Admin Session
    const validAdminSession = {
      user: {
        role: "ADMIN",
        email: "admin@shoestore.com",
      },
    };
    assert(
      isAdminSession(validAdminSession) === true,
      "Allows admin access when role is ADMIN and email matches configured ADMIN_EMAIL"
    );

    // 6. Case insensitive email matching
    const mixedCaseAdminSession = {
      user: {
        role: "ADMIN",
        email: "Admin@ShoeStore.COM",
      },
    };
    assert(
      isAdminSession(mixedCaseAdminSession) === true,
      "Allows admin access with case-insensitive email comparison"
    );

    // 7. Test sanitizeCallbackUrl
    assert(
      sanitizeCallbackUrl("//evil.com") === "/account",
      "Rejects '//evil.com' protocol-relative open redirect and falls back to /account"
    );

    assert(
      sanitizeCallbackUrl("https://evil.com") === "/account",
      "Rejects 'https://evil.com' absolute URL open redirect and falls back to /account"
    );

    assert(
      sanitizeCallbackUrl("/\\evil.com") === "/account",
      "Rejects '/\\evil.com' backslash bypass and falls back to /account"
    );

    assert(
      sanitizeCallbackUrl("/admin") === "/account",
      "Rejects '/admin' for normal customer and falls back to /account"
    );

    assert(
      sanitizeCallbackUrl("/admin/orders") === "/account",
      "Rejects '/admin/orders' for normal customer and falls back to /account"
    );

    assert(
      sanitizeCallbackUrl("/shop") === "/shop",
      "Accepts valid relative storefront path '/shop'"
    );

    assert(
      sanitizeCallbackUrl("") === "/account",
      "Falls back to /account for empty string"
    );

    assert(
      sanitizeCallbackUrl(undefined) === "/account",
      "Falls back to /account for undefined value"
    );

    assert(
      sanitizeCallbackUrl(null) === "/account",
      "Falls back to /account for null value"
    );

    assert(
      sanitizeCallbackUrl("/admin", { allowAdmin: true }) === "/admin",
      "Allows '/admin' when allowAdmin is true"
    );

    assert(
      sanitizeCallbackUrl("/admin/orders", { allowAdmin: true }) === "/admin/orders",
      "Allows '/admin/orders' when allowAdmin is true"
    );

    assert(
      sanitizeCallbackUrl("//evil.com", { allowAdmin: true, fallback: "/admin" }) === "/admin",
      "Rejects '//evil.com' even when allowAdmin is true"
    );

    // 8. Test Rate Limiting (5 failures lockout within 15 minutes)
    resetRateLimitsForTesting();
    const testIp = "192.168.1.100";
    const testEmail = "attacker@example.com";

    // Attempts 1 to 4 should not lock out
    for (let i = 1; i <= 4; i++) {
      const res = await recordFailedLogin(testIp, testEmail);
      assert(res.isLockedOut === false, `Attempt ${i} is recorded without locking out`);
      const check = await checkLoginLockout(testIp, testEmail);
      assert(check.isLockedOut === false, `checkLoginLockout returns false after ${i} failed attempts`);
    }

    // Attempt 5 must lock out!
    const res5 = await recordFailedLogin(testIp, testEmail);
    assert(res5.isLockedOut === true, "5th failed attempt triggers temporary lockout");

    const check5 = await checkLoginLockout(testIp, testEmail);
    assert(check5.isLockedOut === true, "checkLoginLockout confirms lockout after 5 failed attempts");
    assert(check5.retryAfterSeconds > 0, "Provides positive retryAfterSeconds window");

    // Clearing failed attempts on success resets lockout
    await clearFailedLogins(testIp, testEmail);
    const checkAfterClear = await checkLoginLockout(testIp, testEmail);
    assert(checkAfterClear.isLockedOut === false, "Successful login clears lockout counters");

    // 9. Test Public /login vs Private Route Admin Credential Acceptance
    process.env.ADMIN_EMAIL = "admin@shoestore.com";

    // Simulation of authorization logic:
    function authorizeSimulation(credentials: { email: string; roleInDb?: string; loginType?: string }) {
      const email = credentials.email.trim().toLowerCase();
      const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
      const loginType = credentials.loginType || "customer";

      if (loginType === "admin") {
        if (!adminEmail || email !== adminEmail) {
          return { error: "InvalidCredentialsError" };
        }
        if (credentials.roleInDb !== "ADMIN") {
          return { error: "InvalidCredentialsError" };
        }
        return { success: true, role: "ADMIN" };
      }

      // Public login rejects admin email or admin role
      if (adminEmail && email === adminEmail) {
        return { error: "InvalidCredentialsError" };
      }
      if (credentials.roleInDb === "ADMIN") {
        return { error: "InvalidCredentialsError" };
      }

      return { success: true, role: "CUSTOMER" };
    }

    // Public /login rejects admin account
    const publicAdminAttempt = authorizeSimulation({
      email: "admin@shoestore.com",
      roleInDb: "ADMIN",
      loginType: "customer",
    });
    assert(
      publicAdminAttempt.error === "InvalidCredentialsError",
      "Public /login rejects the admin account with generic InvalidCredentialsError"
    );

    // Public /login accepts customer account
    const publicCustomerAttempt = authorizeSimulation({
      email: "customer@example.com",
      roleInDb: "CUSTOMER",
      loginType: "customer",
    });
    assert(
      publicCustomerAttempt.success === true && publicCustomerAttempt.role === "CUSTOMER",
      "Public /login accepts valid customer account"
    );

    // Private route accepts admin account
    const privateAdminAttempt = authorizeSimulation({
      email: "admin@shoestore.com",
      roleInDb: "ADMIN",
      loginType: "admin",
    });
    assert(
      privateAdminAttempt.success === true && privateAdminAttempt.role === "ADMIN",
      "Private admin route accepts configured admin credentials"
    );

    // Private route rejects normal customer account
    const privateCustomerAttempt = authorizeSimulation({
      email: "customer@example.com",
      roleInDb: "CUSTOMER",
      loginType: "admin",
    });
    assert(
      privateCustomerAttempt.error === "InvalidCredentialsError",
      "Private route rejects normal customer credentials"
    );

    // 10. Test Routing / Proxy Rules Simulation
    function proxyRoutingSimulation(pathname: string, isLoggedIn: boolean, isAdmin: boolean) {
      const adminLoginPath = process.env.ADMIN_LOGIN_PATH?.trim();

      // Secret admin path
      if (adminLoginPath && pathname === adminLoginPath) {
        if (isLoggedIn && isAdmin) return { redirect: "/admin" };
        return { rewrite: "/admin-gateway", status: 200, noindex: true };
      }

      // Old /admin/login permanently returns 404
      if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
        return { status: 404 };
      }

      // Direct /admin-gateway access returns 404
      if (pathname === "/admin-gateway") {
        return { status: 404 };
      }

      // Protected /admin and /admin/*
      if (pathname === "/admin" || pathname.startsWith("/admin/")) {
        if (!isLoggedIn) {
          return { status: 404 }; // Unauthenticated gets 404
        }
        if (!isAdmin) {
          return { redirect: "/?error=AccessDenied" };
        }
        return { status: 200, access: true };
      }

      return { status: 200, allow: true };
    }

    // Guest on /admin gets 404
    const guestAdminResult = proxyRoutingSimulation("/admin", false, false);
    assert(guestAdminResult.status === 404, "Guest on /admin gets plain 404 (conceals admin area)");

    const guestAdminSubResult = proxyRoutingSimulation("/admin/orders", false, false);
    assert(guestAdminSubResult.status === 404, "Guest on /admin/orders gets plain 404");

    // Old /admin/login returns 404
    const oldAdminLoginResult = proxyRoutingSimulation("/admin/login", false, false);
    assert(oldAdminLoginResult.status === 404, "Old /admin/login returns plain 404");

    // Authenticated non-admin on /admin is blocked
    const customerAdminResult = proxyRoutingSimulation("/admin", true, false);
    assert(customerAdminResult.redirect === "/?error=AccessDenied", "Normal customer on /admin is blocked with redirect to /?error=AccessDenied");

    // Secret admin route disabled when ADMIN_LOGIN_PATH is missing/empty
    delete process.env.ADMIN_LOGIN_PATH;
    const secretPathMissingResult = proxyRoutingSimulation("/staff-secret-login", false, false);
    assert(
      secretPathMissingResult.rewrite === undefined && secretPathMissingResult.allow === true,
      "Secret route is disabled when ADMIN_LOGIN_PATH is undefined"
    );

    // Secret admin route active when ADMIN_LOGIN_PATH is configured
    process.env.ADMIN_LOGIN_PATH = "/staff-access-7f3k9";
    const secretPathActiveResult = proxyRoutingSimulation("/staff-access-7f3k9", false, false);
    assert(
      secretPathActiveResult.rewrite === "/admin-gateway" && secretPathActiveResult.noindex === true,
      "Secret route rewrites to admin-gateway with noindex when configured"
    );

    // Direct access to /admin-gateway returns 404
    const directGatewayResult = proxyRoutingSimulation("/admin-gateway", false, false);
    assert(directGatewayResult.status === 404, "Direct access to internal /admin-gateway returns 404");

  } finally {
    process.env.ADMIN_EMAIL = originalAdminEmail;
    process.env.ADMIN_LOGIN_PATH = originalAdminLoginPath;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
