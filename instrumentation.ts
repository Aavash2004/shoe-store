import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (!process.env.NEXT_RUNTIME || process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");

    // Startup / boot check for production readiness
    if (process.env.NODE_ENV === "production") {
      const missingEnvVars: string[] = [];

      if (!process.env.ADMIN_EMAIL?.trim()) {
        missingEnvVars.push("ADMIN_EMAIL");
      }

      const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
      if (!sentryDsn?.trim()) {
        missingEnvVars.push("SENTRY_DSN (or NEXT_PUBLIC_SENTRY_DSN)");
      }

      if (!process.env.UPSTASH_REDIS_REST_URL?.trim()) {
        missingEnvVars.push("UPSTASH_REDIS_REST_URL");
      }

      if (!process.env.UPSTASH_REDIS_REST_TOKEN?.trim()) {
        missingEnvVars.push("UPSTASH_REDIS_REST_TOKEN");
      }

      if (missingEnvVars.length > 0) {
        const errorMsg = `🚨 [CRITICAL BOOT CONFIG ERROR] Missing required production environment variables: ${missingEnvVars.join(
          ", "
        )}. Operations, critical alerts, rate limiting, and error monitoring will be compromised!`;
        console.error(errorMsg);
        try {
          Sentry.captureMessage(errorMsg, {
            level: "fatal",
            extra: { missingEnvVars },
          });
        } catch (sentryErr) {
          console.error("[Boot Check] Failed to send boot failure to Sentry:", sentryErr);
        }
      } else {
        console.log(
          "✅ [Boot Check] Production environment verified: ADMIN_EMAIL, SENTRY_DSN, and UPSTASH_REDIS are configured."
        );
      }
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
