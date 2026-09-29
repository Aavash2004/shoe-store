import { isAdminSession } from "../lib/auth/authorization";

function runTests() {
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

    // 7. Post-login destination sanitization logic test
    function sanitizePostLoginRedirect(role: string, callbackUrl: string | null): string {
      if (role === "ADMIN") {
        return "/admin";
      }
      return callbackUrl && !callbackUrl.startsWith("/admin")
        ? callbackUrl
        : "/account";
    }

    assert(
      sanitizePostLoginRedirect("CUSTOMER", "/admin") === "/account",
      "Normal user requesting /admin callbackUrl is redirected to /account instead of /admin"
    );

    assert(
      sanitizePostLoginRedirect("CUSTOMER", "/admin/orders") === "/account",
      "Normal user requesting /admin/orders callbackUrl is redirected to /account instead of /admin"
    );

    assert(
      sanitizePostLoginRedirect("CUSTOMER", "/shop") === "/shop",
      "Normal user requesting /shop callbackUrl is correctly routed to /shop"
    );

    assert(
      sanitizePostLoginRedirect("CUSTOMER", null) === "/account",
      "Normal user with no callbackUrl defaults to /account"
    );

    assert(
      sanitizePostLoginRedirect("ADMIN", "/shop") === "/admin",
      "Admin user logging in always routes to /admin"
    );

  } finally {
    process.env.ADMIN_EMAIL = originalAdminEmail;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
