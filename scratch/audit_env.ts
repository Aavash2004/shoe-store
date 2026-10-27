import "dotenv/config";

const expectedVars = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "NEXTAUTH_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "ADMIN_LOGIN_PATH",
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_KHALTI_PUBLIC_KEY",
  "KHALTI_SECRET_KEY",
  "KHALTI_API_URL",
  "EXCHANGERATE_API_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "CRON_SECRET",
  "NEXT_PUBLIC_SENTRY_DSN",
  "SENTRY_DSN"
];

console.log("=== ENVIRONMENT VARIABLES AUDIT ===");
expectedVars.forEach((v) => {
  const val = process.env[v];
  if (!val) {
    console.log(`❌ ${v}: NOT SET`);
  } else if (val.includes("your-") || val.includes("example") || val.includes("generate-a")) {
    console.log(`⚠️ ${v}: PLACEHOLDER VALUE ("${val.substring(0, 15)}...")`);
  } else {
    console.log(`✅ ${v}: CONFIGURED`);
  }
});
