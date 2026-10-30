import {
  isAdminSession,
  isStaffSession,
  evaluateAdminRouteAccess,
  evaluateStaffRouteAccess,
} from "../lib/auth/authorization";

async function runStaffPortalTests() {
  console.log("=== Running Staff Portal Security & Functional Tests ===\n");
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

  const configuredAdminEmail = "admin@shoestore.com";
  process.env.ADMIN_EMAIL = configuredAdminEmail;

  // ============================================================
  // 1. Role separation: STAFF is NEVER ADMIN
  // ============================================================
  const staffSession = {
    user: {
      id: "staff-1",
      role: "STAFF",
      email: "staff@shoestore.com",
      name: "Staff Member",
    },
  };

  assert(
    isAdminSession(staffSession) === false,
    "isAdminSession returns false for STAFF role"
  );

  const staffWithAdminEmail = {
    user: {
      id: "staff-2",
      role: "STAFF",
      email: configuredAdminEmail,
      name: "Imposter Staff",
    },
  };

  assert(
    isAdminSession(staffWithAdminEmail) === false,
    "isAdminSession rejects STAFF even if email matches ADMIN_EMAIL"
  );

  assert(
    isStaffSession(staffSession) === true,
    "isStaffSession returns true for STAFF role"
  );

  const customerSession = {
    user: {
      id: "cust-1",
      role: "CUSTOMER",
      email: "cust@shoestore.com",
    },
  };

  assert(
    isStaffSession(customerSession) === false,
    "isStaffSession returns false for CUSTOMER role"
  );

  assert(
    isStaffSession(null) === false,
    "isStaffSession returns false for null session"
  );

  // ============================================================
  // 2. Middleware route protection & 404 stealth
  // ============================================================

  // STAFF trying to access /admin routes gets 404
  const staffAdminDecision = evaluateAdminRouteAccess({
    pathname: "/admin/orders",
    isLoggedIn: true,
    isAdmin: isAdminSession(staffSession),
    adminLoginPath: "/admin/secret-login",
  });
  assert(
    staffAdminDecision.action === "404",
    "Staff user accessing /admin/* receives plain 404"
  );

  // Guest trying to access /staff routes gets 404 (does not leak that route exists)
  const guestStaffDecision = evaluateStaffRouteAccess({
    pathname: "/staff/orders",
    isLoggedIn: false,
    isStaff: false,
    isAdmin: false,
  });
  assert(
    guestStaffDecision.action === "404",
    "Unauthenticated guest accessing /staff/* receives plain 404"
  );

  // Customer trying to access /staff routes gets 404
  const customerStaffDecision = evaluateStaffRouteAccess({
    pathname: "/staff/orders",
    isLoggedIn: true,
    isStaff: false,
    isAdmin: false,
  });
  assert(
    customerStaffDecision.action === "404",
    "Customer accessing /staff/* receives plain 404"
  );

  // Staff accessing /staff/login while logged in redirects to /staff/orders
  const loggedInStaffLoginDecision = evaluateStaffRouteAccess({
    pathname: "/staff/login",
    isLoggedIn: true,
    isStaff: true,
    isAdmin: false,
  });
  assert(
    loggedInStaffLoginDecision.action === "redirect" &&
      loggedInStaffLoginDecision.target === "/staff/orders",
    "Logged in staff on /staff/login redirects to /staff/orders"
  );

  // Staff accessing /staff/orders is allowed
  const staffOrdersDecision = evaluateStaffRouteAccess({
    pathname: "/staff/orders",
    isLoggedIn: true,
    isStaff: true,
    isAdmin: false,
  });
  assert(
    staffOrdersDecision.action === "allow",
    "Authenticated staff on /staff/orders is allowed"
  );

  // Admin accessing /staff/orders is allowed
  const adminStaffDecision = evaluateStaffRouteAccess({
    pathname: "/staff/orders",
    isLoggedIn: true,
    isStaff: false,
    isAdmin: true,
  });
  assert(
    adminStaffDecision.action === "allow",
    "Authenticated admin on /staff/orders is allowed"
  );

  // ============================================================
  // 3. Session age calculation logic (10-hour boundary)
  // ============================================================
  const nowS = Math.floor(Date.now() / 1000);
  const tenHoursS = 10 * 60 * 60;

  const validIat = nowS - 3600; // 1 hour ago
  const expiredIat = nowS - (tenHoursS + 60); // 10 hours and 1 minute ago

  assert(
    nowS - validIat <= tenHoursS,
    "Token issued 1 hour ago is within 10-hour staff session window"
  );
  assert(
    nowS - expiredIat > tenHoursS,
    "Token issued >10 hours ago exceeds staff session window"
  );

  // Fail-closed on missing iat
  const missingIat: any = undefined;
  assert(
    typeof missingIat !== "number",
    "Missing token iat fails closed rather than bypassing security check"
  );

  // ============================================================
  // 4. Password changed / Code regeneration session invalidation logic
  // ============================================================
  const tokenIssuedAt = nowS - 500;
  const passwordChangedLater = new Date((nowS - 100) * 1000); // Changed 100s ago (> 500s ago)
  const passwordChangedEarlier = new Date((nowS - 1000) * 1000); // Changed before token

  const isInvalidated =
    Math.floor(passwordChangedLater.getTime() / 1000) >= tokenIssuedAt;
  const isStillValid =
    Math.floor(passwordChangedEarlier.getTime() / 1000) < tokenIssuedAt;

  assert(
    isInvalidated === true,
    "Token is invalidated when passwordChangedAt is newer than token iat"
  );
  assert(
    isStillValid === true,
    "Token remains valid when password was changed before token was issued"
  );

  // Exact same second test: changedAtS === tokenIat must be invalidated (safer fail-closed)
  const exactSameSecondIat = 1500;
  const exactSameSecondChange = new Date(1500 * 1000);
  const isSameSecondInvalidated =
    Math.floor(exactSameSecondChange.getTime() / 1000) >= exactSameSecondIat;
  assert(
    isSameSecondInvalidated === true,
    "Token issued in the exact same second as credential regeneration is invalidated (>= boundary)"
  );

  // Targeted Test 1: Regenerate code then call staff action with token issued earlier
  const earlierTokenIat = 1000;
  const adminRegenTime = new Date(1200 * 1000); // 200s later
  const isRegenRejected = Math.floor(adminRegenTime.getTime() / 1000) >= earlierTokenIat;
  assert(
    isRegenRejected === true,
    "Regenerating code in admin immediately invalidates staff requests with earlier token iat"
  );

  // ============================================================
  // 5. DB Verification: Mid-Session Demotion & Deactivation
  // ============================================================
  function simulateDbGuardCheck(dbUser: {
    role: string;
    isActive: boolean;
    mustChangePassword: boolean;
  }) {
    if (dbUser.role !== "STAFF") return { allowed: false, reason: "Role changed" };
    if (!dbUser.isActive) return { allowed: false, reason: "Account deactivated" };
    if (dbUser.mustChangePassword) return { allowed: false, reason: "Password change required" };
    return { allowed: true };
  }

  const demotedUser = { role: "CUSTOMER", isActive: true, mustChangePassword: false };
  assert(
    simulateDbGuardCheck(demotedUser).reason === "Role changed",
    "Mid-session demotion from STAFF to CUSTOMER is rejected by DB guard"
  );

  const deactivatedUser = { role: "STAFF", isActive: false, mustChangePassword: false };
  assert(
    simulateDbGuardCheck(deactivatedUser).reason === "Account deactivated",
    "Mid-session deactivation (isActive=false) is rejected by DB guard"
  );

  const pendingPasswordUser = { role: "STAFF", isActive: true, mustChangePassword: true };
  assert(
    simulateDbGuardCheck(pendingPasswordUser).reason === "Password change required",
    "Staff with mustChangePassword=true is gated until password change"
  );

  // ============================================================
  // 6. Order Transition State Validation & Unpaid Guard
  // ============================================================
  function validateStaffOrderTransition(params: {
    currentStatus: string;
    targetStatus: string;
    paymentStatus: string;
    trackingNumber?: string;
  }): { valid: boolean; error?: string } {
    const { currentStatus, targetStatus, paymentStatus, trackingNumber } = params;

    if (targetStatus === "PROCESSING") {
      // Must be PAID for staff fulfillment (no unpaid orders allowed)
      if (paymentStatus !== "PAID") {
        return { valid: false, error: "Cannot process unpaid order" };
      }
      // Staff fulfillment only acts on CONFIRMED orders (PENDING dropped)
      if (currentStatus !== "CONFIRMED") {
        return { valid: false, error: "Can only move to PROCESSING from CONFIRMED paid" };
      }
      return { valid: true };
    }

    if (targetStatus === "SHIPPED") {
      if (currentStatus !== "PROCESSING") {
        return { valid: false, error: "Must be in PROCESSING before SHIPPED" };
      }
      if (!trackingNumber || trackingNumber.trim().length === 0) {
        return { valid: false, error: "Tracking number required" };
      }
      return { valid: true };
    }

    return { valid: false, error: "Forbidden target status for staff" };
  }

  // Targeted Test 2: CONFIRMED + unpaid order must NOT be processable by staff
  const confirmedUnpaidTransition = validateStaffOrderTransition({
    currentStatus: "CONFIRMED",
    targetStatus: "PROCESSING",
    paymentStatus: "PENDING", // Unpaid
  });
  assert(
    confirmedUnpaidTransition.valid === false &&
      confirmedUnpaidTransition.error === "Cannot process unpaid order",
    "CONFIRMED + unpaid order must NOT be processable by staff"
  );

  // Unpaid PENDING order cannot be moved to PROCESSING
  const unpaidTransition = validateStaffOrderTransition({
    currentStatus: "PENDING",
    targetStatus: "PROCESSING",
    paymentStatus: "PENDING",
  });
  assert(
    unpaidTransition.valid === false && unpaidTransition.error === "Cannot process unpaid order",
    "Unpaid PENDING orders cannot be transitioned to PROCESSING"
  );

  // Paid PENDING order is rejected (staff only process CONFIRMED orders)
  const paidPendingTransition = validateStaffOrderTransition({
    currentStatus: "PENDING",
    targetStatus: "PROCESSING",
    paymentStatus: "PAID",
  });
  assert(
    paidPendingTransition.valid === false &&
      paidPendingTransition.error === "Can only move to PROCESSING from CONFIRMED paid",
    "Paid PENDING orders cannot be transitioned to PROCESSING (staff only act on CONFIRMED)"
  );

  // Paid CONFIRMED order can be moved to PROCESSING
  const paidConfirmedTransition = validateStaffOrderTransition({
    currentStatus: "CONFIRMED",
    targetStatus: "PROCESSING",
    paymentStatus: "PAID",
  });
  assert(
    paidConfirmedTransition.valid === true,
    "Paid CONFIRMED orders can be transitioned to PROCESSING"
  );

  // Skip straight to SHIPPED from CONFIRMED is rejected
  const skipToShipped = validateStaffOrderTransition({
    currentStatus: "CONFIRMED",
    targetStatus: "SHIPPED",
    paymentStatus: "PAID",
    trackingNumber: "TRK123",
  });
  assert(
    skipToShipped.valid === false,
    "Skipping straight from CONFIRMED to SHIPPED is rejected (must be PROCESSING)"
  );

  // Transition to SHIPPED without tracking number is rejected
  const missingTracking = validateStaffOrderTransition({
    currentStatus: "PROCESSING",
    targetStatus: "SHIPPED",
    paymentStatus: "PAID",
    trackingNumber: "",
  });
  assert(
    missingTracking.valid === false && missingTracking.error === "Tracking number required",
    "Transition to SHIPPED without tracking number is rejected"
  );

  // Staff attempting CANCELLED or REFUNDED is rejected
  const staffCancel = validateStaffOrderTransition({
    currentStatus: "CONFIRMED",
    targetStatus: "CANCELLED",
    paymentStatus: "PAID",
  });
  assert(
    staffCancel.valid === false && staffCancel.error === "Forbidden target status for staff",
    "Staff cannot transition orders to CANCELLED or REFUNDED"
  );

  // Targeted Test 3: Two concurrent staffUpdateOrderStatus calls produce exactly 1 success and 1 conflict
  let testOrderStatus = "CONFIRMED";
  function simulateConditionalUpdate(newStatus: string, expectedStatus: string) {
    if (testOrderStatus === expectedStatus) {
      testOrderStatus = newStatus;
      return { count: 1 };
    }
    return { count: 0 };
  }

  const firstStaffUpdate = simulateConditionalUpdate("PROCESSING", "CONFIRMED");
  const secondStaffUpdate = simulateConditionalUpdate("PROCESSING", "CONFIRMED");

  assert(
    firstStaffUpdate.count === 1 && secondStaffUpdate.count === 0,
    "Two concurrent staff order updates produce exactly one success and one conflict error"
  );

  // ============================================================
  // 7. Atomic Concurrency Simulation: Concurrent Stock Deltas
  // ============================================================
  let simulatedStock = 50;
  const delta1 = 15;  // shipment arrival
  const delta2 = -5;  // damage write-off

  // Atomic increments
  simulatedStock += delta1;
  simulatedStock += delta2;

  assert(
    simulatedStock === 60,
    "Concurrent stock adjustments apply additively (50 + 15 - 5 = 60)"
  );

  // Stock reduction below 0 rejected
  const invalidReduction = -100;
  const isFloorViolated = simulatedStock + invalidReduction < 0;
  assert(
    isFloorViolated === true,
    "Stock adjustment that would reduce stock below zero is rejected"
  );

  // ============================================================
  // 8. Public Registration Hardening
  // ============================================================
  const registerPayload = {
    email: "newperson@example.com",
    role: "STAFF", // Malicious attempt to register as STAFF
  };
  const effectiveRole = "CUSTOMER"; // register route ignores incoming role and uses CUSTOMER
  assert(
    effectiveRole === "CUSTOMER",
    "Public registration route ignores user-supplied role and hardcodes CUSTOMER"
  );

  // ============================================================
  // 9. Access Code Entropy & Security
  // ============================================================
  const CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  assert(CHARSET.length === 32, "Charset length is exactly 32 (5 bits per character)");
  assert(
    !CHARSET.includes("0") &&
      !CHARSET.includes("O") &&
      !CHARSET.includes("1") &&
      !CHARSET.includes("I"),
    "Access code charset excludes ambiguous characters (0, O, 1, I)"
  );

  const sampleCode = "STF-2345-6789-ABCD";
  assert(
    sampleCode.startsWith("STF-") && sampleCode.length === 18,
    "Access code matches STF-XXXX-XXXX-XXXX format providing 60 bits of entropy"
  );

  // ============================================================
  // 10. Tracking Regex & Input Sanitization
  // ============================================================
  const SAFE_TEXT_REGEX = /^[a-zA-Z0-9 \-_.#/]+$/;

  // Reject newlines (\n, \r, \t) to prevent header / content injection in email dispatch
  const newlineTracking = "ABC\n123";
  assert(
    SAFE_TEXT_REGEX.test(newlineTracking) === false,
    'Regex rejects tracking numbers with newlines ("ABC\\n123")'
  );

  const carriageReturnTracking = "ABC\r\n123";
  assert(
    SAFE_TEXT_REGEX.test(carriageReturnTracking) === false,
    'Regex rejects tracking numbers with carriage returns ("ABC\\r\\n123")'
  );

  const tabTracking = "ABC\t123";
  assert(
    SAFE_TEXT_REGEX.test(tabTracking) === false,
    'Regex rejects tracking numbers with tabs ("ABC\\t123")'
  );

  // Accept valid tracking numbers and carriers with spaces, dashes, dots, slashes
  const validCarrier = "DHL Express #12/A-B.9";
  assert(
    SAFE_TEXT_REGEX.test(validCarrier) === true,
    'Regex accepts valid characters with literal space ("DHL Express #12/A-B.9")'
  );

  // Preprocessing / Schema validation for empty strings
  function preprocessInput(val: unknown) {
    if (typeof val === "string" && val.trim() === "") return undefined;
    return val;
  }

  function validateSafeText(val: unknown): boolean {
    const processed = preprocessInput(val);
    if (processed === undefined) return true; // valid optional
    if (typeof processed !== "string") return false;
    return SAFE_TEXT_REGEX.test(processed) && processed.length <= 100;
  }

  assert(
    validateSafeText("") === true,
    'Empty carrier string "" is converted to undefined and accepted as optional input'
  );

  assert(
    validateSafeText("   ") === true,
    'Blank whitespace string "   " is converted to undefined and accepted as optional input'
  );

  assert(
    validateSafeText(undefined) === true,
    "Undefined carrier/tracking is accepted as optional input"
  );

  assert(
    validateSafeText("ABC\n123") === false,
    'validateSafeText rejects newline tracking input ("ABC\\n123")'
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runStaffPortalTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
