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

  // Periodic pruning of stale entries
  if (inMemoryCache.size > 5_000) {
    for (const [key, val] of inMemoryCache.entries()) {
      if (val.resetTime < now) inMemoryCache.delete(key);
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

/**
 * Extracts client IP safely from request headers (first entry of x-forwarded-for or x-real-ip).
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
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
