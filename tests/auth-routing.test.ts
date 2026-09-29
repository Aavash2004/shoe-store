import { isAdminSession, sanitizeCallbackUrl } from "../lib/auth/authorization";

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

    // 7. Test sanitizeCallbackUrl directly
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

    // Admin option tests
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

  } finally {
    process.env.ADMIN_EMAIL = originalAdminEmail;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
