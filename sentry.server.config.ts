import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  debug: false,
  enabled:
    process.env.NODE_ENV === "production" &&
    Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
  beforeSend(event) {
    // Redact sensitive server payload data
    if (event.request?.data && typeof event.request.data === "object") {
      const scrubKeys = [
        "password",
        "token",
        "secret",
        "cvv",
        "cvc",
        "creditCard",
        "cardNumber",
        "pidx",
        "email",
        "phone",
        "address",
      ];
      for (const k of Object.keys(event.request.data)) {
        if (scrubKeys.some((s) => k.toLowerCase().includes(s))) {
          (event.request.data as any)[k] = "[Redacted]";
        }
      }
    }
    if (event.user) {
      delete event.user.ip_address;
      delete event.user.email;
    }
    return event;
  },
});
