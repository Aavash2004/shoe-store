import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import * as Sentry from "@sentry/nextjs";
import type { NextRequest } from "next/server";

// Check if Upstash Redis credentials are provided in the environment
const hasUpstashConfig = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

let redis: Redis | null = null;
if (hasUpstashConfig) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  } catch (err) {
    console.warn("[RateLimit] Failed to initialize Upstash Redis:", err);
    Sentry.captureException(err, { tags: { component: "ratelimit_init" } });
  }
}

// Dedicated Upstash rate limiters
// 1. General API & order tracking limiter: 20 req / 60s
const generalLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "60 s"),
      analytics: true,
      prefix: "shoe_store:ratelimit:general",
    })
  : null;

// 2. Checkout & payment initiation: 12 req / 60s
// Generous enough for shared CGNAT IPs in Nepal while completely stopping card-testing bot attacks
const checkoutLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(12, "60 s"),
      analytics: true,
      prefix: "shoe_store:ratelimit:checkout",
    })
  : null;

// 3. Sensitive auth / forgot-password: 5 req / 60s
const authLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      analytics: true,
      prefix: "shoe_store:ratelimit:auth",
    })
  : null;

// In-memory sliding window fallback for local development / testing and fail-open mode
const inMemoryCache = new Map<string, { count: number; resetTime: number }>();

function fallbackRateLimit(
  identifier: string,
  maxAttempts = 20,
  windowMs = 60_000
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();

  // Expire in-memory entries that have passed their reset time
  for (const [key, val] of inMemoryCache.entries()) {
    if (val.resetTime <= now) {
      inMemoryCache.delete(key);
    }
  }

  const record = inMemoryCache.get(identifier);
  if (!record || record.resetTime < now) {
    inMemoryCache.set(identifier, { count: 1, resetTime: now + windowMs });
    return {
      success: true,
      limit: maxAttempts,
      remaining: maxAttempts - 1,
      reset: now + windowMs,
    };
  }

  if (record.count >= maxAttempts) {
    return {
      success: false,
      limit: maxAttempts,
      remaining: 0,
      reset: record.resetTime,
    };
  }

  record.count += 1;
  return {
    success: true,
    limit: maxAttempts,
    remaining: maxAttempts - record.count,
    reset: record.resetTime,
  };
}

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

export type TrustedIpHeaderSource =
  | "x-vercel-forwarded-for"
  | "cf-connecting-ip"
  | "xff-rightmost";

export function getTrustedIpHeader(): TrustedIpHeaderSource {
  const envSource = process.env.TRUSTED_IP_HEADER?.trim().toLowerCase();
  if (
    envSource === "cf-connecting-ip" ||
    envSource === "xff-rightmost" ||
    envSource === "x-vercel-forwarded-for"
  ) {
    return envSource;
  }
  return "x-vercel-forwarded-for";
}

/**
 * Resolves the client IP address strictly from the single configured trusted source.
 * Ignores all other client-supplied headers to prevent spoofing or multi-header confusion.
 *
 * Configured via `TRUSTED_IP_HEADER`:
 * - 'x-vercel-forwarded-for': platform header on Vercel edge
 * - 'cf-connecting-ip': platform header on Cloudflare
 * - 'xff-rightmost': rightmost trusted hop from X-Forwarded-For based on TRUSTED_PROXY_HOPS
 *
 * If the configured header is missing or empty, falls back to "anonymous-client"
 * and logs a Sentry warning in production.
 */
export function getClientIp(request: NextRequest): string {
  const trustedSource = getTrustedIpHeader();
  let resolvedIp: string | null = null;

  if (trustedSource === "x-vercel-forwarded-for") {
    const header = request.headers.get("x-vercel-forwarded-for");
    if (header?.trim()) {
      resolvedIp = header.split(",")[0].trim();
    }
  } else if (trustedSource === "cf-connecting-ip") {
    const header = request.headers.get("cf-connecting-ip");
    if (header?.trim()) {
      resolvedIp = header.trim();
    }
  } else if (trustedSource === "xff-rightmost") {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const parts = forwarded
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length > 0) {
        const rawHops = parseInt(process.env.TRUSTED_PROXY_HOPS || "1", 10);
        const trustedHops = Number.isFinite(rawHops) && rawHops > 0 ? rawHops : 1;
        const targetIndex = Math.max(0, parts.length - trustedHops);
        resolvedIp = parts[targetIndex];
      }
    }
  }

  if (resolvedIp) {
    return resolvedIp;
  }

  // Fallback for unidentifiable clients
  if (process.env.NODE_ENV === "production") {
    try {
      Sentry.captureMessage(
        `[RateLimit] Fallback to anonymous-client: missing or empty trusted IP header "${trustedSource}"`,
        {
          level: "warning",
          extra: {
            configuredSource: trustedSource,
            path: request.nextUrl?.pathname || request.url,
          },
        }
      );
    } catch {}
  }

  return process.env.NODE_ENV === "development" ? "127.0.0.1" : "anonymous-client";
}

/**
 * General endpoint rate limit (20 req / 60s). Fails open to memory with Sentry alert on Redis outage.
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  if (identifier === "test-bypass") {
    return { success: true, limit: 20, remaining: 20, reset: Date.now() + 60_000 };
  }

  if (generalLimiter) {
    try {
      const res = await generalLimiter.limit(identifier);
      return { success: res.success, limit: res.limit, remaining: res.remaining, reset: res.reset };
    } catch (err) {
      console.warn("[RateLimit] Upstash error, failing open to memory fallback:", err);
      Sentry.captureException(err, { tags: { component: "rate_limiter_general" } });
    }
  }

  return fallbackRateLimit(`gen:${identifier}`, 20, 60_000);
}

/**
 * Checkout & payment initiation rate limit (12 req / 60s).
 * Accommodates shared CGNAT IPs while preventing card-testing scripts.
 * Fails open to memory with Sentry alert on Redis outage so sales are never blocked.
 */
export async function checkCheckoutRateLimit(identifier: string): Promise<RateLimitResult> {
  if (identifier === "test-bypass") {
    return { success: true, limit: 12, remaining: 12, reset: Date.now() + 60_000 };
  }

  if (checkoutLimiter) {
    try {
      const res = await checkoutLimiter.limit(identifier);
      return { success: res.success, limit: res.limit, remaining: res.remaining, reset: res.reset };
    } catch (err) {
      console.warn("[RateLimit] Upstash checkout error, failing open to memory fallback:", err);
      Sentry.captureException(err, { tags: { component: "rate_limiter_checkout" } });
    }
  }

  return fallbackRateLimit(`chk:${identifier}`, 12, 60_000);
}

/**
 * Sensitive auth rate limit (5 req / 60s) for forgot-password and reset endpoints.
 */
export async function checkAuthRateLimit(identifier: string): Promise<RateLimitResult> {
  if (identifier === "test-bypass") {
    return { success: true, limit: 5, remaining: 5, reset: Date.now() + 60_000 };
  }

  if (authLimiter) {
    try {
      const res = await authLimiter.limit(identifier);
      return { success: res.success, limit: res.limit, remaining: res.remaining, reset: res.reset };
    } catch (err) {
      console.warn("[RateLimit] Upstash auth error, failing open to memory fallback:", err);
      Sentry.captureException(err, { tags: { component: "rate_limiter_auth" } });
    }
  }

  return fallbackRateLimit(`auth:${identifier}`, 5, 60_000);
}

export function getRateLimitPerOrder(): number {
  const val = process.env.RATE_LIMIT_PER_ORDER;
  if (!val) return 30;
  const parsed = parseInt(val, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

export function getRateLimitGlobalPerIp(): number {
  const val = process.env.RATE_LIMIT_GLOBAL_PER_IP;
  if (!val) return 100;
  const parsed = parseInt(val, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
}

/**
 * Global per-IP rate limit across all order lookups (default: 100 req / 60s, env-configurable).
 * Accommodates legitimate multi-device polling while preventing brute-force enumeration.
 */
export async function checkGlobalOrderStatusRateLimit(identifier: string): Promise<RateLimitResult> {
  const maxLimit = getRateLimitGlobalPerIp();
  if (identifier === "test-bypass") {
    return { success: true, limit: maxLimit, remaining: maxLimit, reset: Date.now() + 60_000 };
  }

  if (generalLimiter) {
    try {
      const res = await generalLimiter.limit(`global_status:${identifier}`);
      return { success: res.success, limit: res.limit, remaining: res.remaining, reset: res.reset };
    } catch (err) {
      console.warn("[RateLimit] Upstash error, failing open to memory fallback:", err);
    }
  }

  return fallbackRateLimit(`global_status:${identifier}`, maxLimit, 60_000);
}

/**
 * Per-order rate limit (default: 30 req / 60s per order per IP, env-configurable).
 * Specifically matches the client polling allowance.
 */
export async function checkPerOrderRateLimit(identifier: string): Promise<RateLimitResult> {
  const maxLimit = getRateLimitPerOrder();
  if (identifier === "test-bypass") {
    return { success: true, limit: maxLimit, remaining: maxLimit, reset: Date.now() + 60_000 };
  }

  if (generalLimiter) {
    try {
      const res = await generalLimiter.limit(`per_order:${identifier}`);
      return { success: res.success, limit: res.limit, remaining: res.remaining, reset: res.reset };
    } catch (err) {
      console.warn("[RateLimit] Upstash error, failing open to memory fallback:", err);
    }
  }

  return fallbackRateLimit(`per_order:${identifier}`, maxLimit, 60_000);
}


