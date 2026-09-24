import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Check if Upstash Redis credentials are provided in the environment
const hasUpstashConfig = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

let upstashLimiter: Ratelimit | null = null;

if (hasUpstashConfig) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  upstashLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    analytics: true,
    prefix: "shoe_store:ratelimit:track",
  });
}

// In-memory sliding window fallback for local development / testing
const inMemoryCache = new Map<string, { count: number; resetTime: number }>();

function fallbackRateLimit(
  identifier: string,
  maxAttempts = 10,
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

/**
 * Validates request rate limit against Upstash Redis (distributed production)
 * or falls back to in-memory sliding window (development/testing).
 */
export async function checkRateLimit(
  identifier: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  // Always permit test bypass if flagged
  if (identifier === "test-bypass") {
    return { success: true, limit: 10, remaining: 10, reset: Date.now() + 60_000 };
  }

  if (upstashLimiter) {
    try {
      const result = await upstashLimiter.limit(identifier);
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch (redisErr) {
      console.warn("[RateLimit] Upstash Redis error, falling back to local memory:", redisErr);
      return fallbackRateLimit(identifier);
    }
  }

  return fallbackRateLimit(identifier);
}
