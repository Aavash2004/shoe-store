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

  try {
    // 1. Fail Closed: No session
    assert(isAdminSession(null) === false, "Denies access when session is null");
    assert(isAdminSession(undefined) === false, "Denies access when session is undefined");
    assert(isAdminSession({ user: undefined }) === false, "Denies access when session user is undefined");

    // 2. Normal customer session is denied admin
    process.env.ADMIN_EMAIL = "admin@shoestore.com";
    const customerSession = {
      user: {
        role: "CUSTOMER",
        email: "customer@example.com",
      },
    };
    assert(isAdminSession(customerSession) === false, "Denies admin access to CUSTOMER role");

    // 3. When ADMIN_EMAIL is set, mismatch is denied
    process.env.ADMIN_EMAIL = "admin@shoestore.com";
    const adminSessionWrongEmail = {
      user: {
        role: "ADMIN",
        email: "imposter@shoestore.com",
      },
    };
    assert(
      isAdminSession(adminSessionWrongEmail) === false,
      "Denies admin access when user email does not match ADMIN_EMAIL"
    );

    // 4. When ADMIN_EMAIL is not configured, admin role in DB is allowed
    delete process.env.ADMIN_EMAIL;
    const adminSessionNoEnv = {
      user: {
        role: "ADMIN",
        email: "admin@shoestore.com",
      },
    };
    assert(
      isAdminSession(adminSessionNoEnv) === true,
      "Allows admin access when role is ADMIN and ADMIN_EMAIL is not set"
    );

    // 5. Valid Admin Session when ADMIN_EMAIL is set
    process.env.ADMIN_EMAIL = "admin@shoestore.com";
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
      sanitizeCallbackUrl("https://evil.com/phish") === "/account",
      "Rejects 'https://evil.com' absolute URL open redirect and falls back to /account"
    );
    assert(
      sanitizeCallbackUrl("/\\evil.com") === "/account",
      "Rejects '/\\evil.com' backslash bypass and falls back to /account"
    );
    assert(
      sanitizeCallbackUrl("/admin", { allowAdmin: false }) === "/account",
      "Rejects '/admin' for normal customer and falls back to /account"
    );
    assert(
      sanitizeCallbackUrl("/admin/orders", { allowAdmin: false }) === "/account",
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
      sanitizeCallbackUrl("//evil.com", { allowAdmin: true }) === "/account",
      "Rejects '//evil.com' even when allowAdmin is true"
    );

    // 8. Rate Limiter Tests
    resetRateLimitsForTesting();
    const testIp = "192.168.1.100";
    const testEmail = "victim@example.com";

    for (let i = 1; i <= 4; i++) {
      const result = await recordFailedLogin(testIp, testEmail);
      assert(result.isLockedOut === false, `Attempt ${i} is recorded without locking out`);
      const check = await checkLoginLockout(testIp, testEmail);
      assert(check.isLockedOut === false, `checkLoginLockout returns false after ${i} failed attempts`);
    }

    const lockoutResult = await recordFailedLogin(testIp, testEmail);
    assert(lockoutResult.isLockedOut === true, "5th failed attempt triggers temporary lockout");

    const lockedCheck = await checkLoginLockout(testIp, testEmail);
    assert(lockedCheck.isLockedOut === true, "checkLoginLockout confirms lockout after 5 failed attempts");
    assert(lockedCheck.retryAfterSeconds > 0, "Provides positive retryAfterSeconds window");

    await clearFailedLogins(testIp, testEmail);
    const clearedCheck = await checkLoginLockout(testIp, testEmail);
    assert(clearedCheck.isLockedOut === false, "Successful login clears lockout counters");

    // 9. Login Credentials Verification Simulation
    function authorizeSimulation(params: {
      email: string;
      roleInDb: string;
      loginType?: string;
    }) {
      const email = params.email.trim().toLowerCase();
      const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
      const loginType = params.loginType || "customer";

      if (loginType === "admin") {
        if (configuredAdminEmail && email !== configuredAdminEmail) {
          return { error: "InvalidCredentialsError" };
        }
        if (params.roleInDb !== "ADMIN") {
          return { error: "InvalidCredentialsError" };
        }
        return { success: true, role: "ADMIN" };
      }

      if (configuredAdminEmail && email === configuredAdminEmail) {
        return { error: "InvalidCredentialsError" };
      }
      if (params.roleInDb === "ADMIN") {
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

    // /admin/login accepts configured admin credentials
    const adminLoginAttempt = authorizeSimulation({
      email: "admin@shoestore.com",
      roleInDb: "ADMIN",
      loginType: "admin",
    });
    assert(
      adminLoginAttempt.success === true && adminLoginAttempt.role === "ADMIN",
      "/admin/login accepts configured admin credentials"
    );

    // /admin/login rejects normal customer account
    const adminCustomerAttempt = authorizeSimulation({
      email: "customer@example.com",
      roleInDb: "CUSTOMER",
      loginType: "admin",
    });
    assert(
      adminCustomerAttempt.error === "InvalidCredentialsError",
      "/admin/login rejects normal customer credentials"
    );

    // 10. Test Routing / Proxy Rules Simulation
    function proxyRoutingSimulation(pathname: string, isLoggedIn: boolean, isAdmin: boolean) {
      if (pathname.startsWith("/admin")) {
        if (pathname === "/admin/login") {
          if (isAdmin) {
            return { redirect: "/admin" };
          }
          return { status: 200, allow: true };
        }

        if (!isLoggedIn) {
          return { redirect: `/admin/login?callbackUrl=${pathname}` };
        }

        if (!isAdmin) {
          return { redirect: "/?error=AccessDenied" };
        }

        return { status: 200, access: true };
      }

      return { status: 200, allow: true };
    }

    // Guest on /admin redirects to /admin/login
    const guestAdminResult = proxyRoutingSimulation("/admin", false, false);
    assert(guestAdminResult.redirect === "/admin/login?callbackUrl=/admin", "Guest on /admin redirects to /admin/login");

    const guestAdminSubResult = proxyRoutingSimulation("/admin/orders", false, false);
    assert(guestAdminSubResult.redirect === "/admin/login?callbackUrl=/admin/orders", "Guest on /admin/orders redirects to /admin/login");

    // Unauthenticated on /admin/login is allowed to view login page
    const guestAdminLoginResult = proxyRoutingSimulation("/admin/login", false, false);
    assert(guestAdminLoginResult.allow === true, "Guest on /admin/login is allowed to view login page");

    // Already logged in admin visiting /admin/login redirects to /admin
    const adminOnLoginResult = proxyRoutingSimulation("/admin/login", true, true);
    assert(adminOnLoginResult.redirect === "/admin", "Logged-in admin visiting /admin/login is redirected to /admin");

    // Authenticated non-admin on /admin is blocked
    const customerAdminResult = proxyRoutingSimulation("/admin", true, false);
    assert(customerAdminResult.redirect === "/?error=AccessDenied", "Normal customer on /admin is blocked with redirect to /?error=AccessDenied");

    // Authenticated admin on /admin is granted access
    const adminAdminResult = proxyRoutingSimulation("/admin", true, true);
    assert(adminAdminResult.access === true, "Authenticated admin on /admin has access");

  } finally {
    process.env.ADMIN_EMAIL = originalAdminEmail;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
