import { Redis } from "@upstash/redis";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_SECONDS = 15 * 60; // 15 minutes
const LOCKOUT_WINDOW_MS = LOCKOUT_WINDOW_SECONDS * 1000;

// Upstash Redis client (used in distributed production environment if configured)
const hasUpstashConfig = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

let redisClient: Redis | null = null;
if (hasUpstashConfig) {
  try {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  } catch (err) {
    console.warn("[RateLimit] Failed to initialize Upstash Redis:", err);
  }
}

// In-memory store fallback (used in development, testing, and when Redis is unconfigured)
interface RateRecord {
  count: number;
  resetTime: number;
}
const memoryStore = new Map<string, RateRecord>();

function getMemoryRecord(key: string): RateRecord | null {
  const record = memoryStore.get(key);
  if (!record) return null;
  if (record.resetTime <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return record;
}

function setMemoryRecord(key: string, count: number, ttlMs: number) {
  memoryStore.set(key, {
    count,
    resetTime: Date.now() + ttlMs,
  });
}

function normalizeKey(prefix: string, value: string): string {
  return `rl:login:failed:${prefix}:${value.trim().toLowerCase()}`;
}

/**
 * Checks if either the IP or email has exceeded max failed attempts.
 */
export async function checkLoginLockout(
  ip: string,
  email: string
): Promise<{ isLockedOut: boolean; retryAfterSeconds: number }> {
  const ipKey = normalizeKey("ip", ip);
  const emailKey = normalizeKey("email", email);

  if (redisClient) {
    try {
      const [ipCount, emailCount, ipTtl, emailTtl] = await Promise.all([
        redisClient.get<number>(ipKey),
        redisClient.get<number>(emailKey),
        redisClient.ttl(ipKey),
        redisClient.ttl(emailKey),
      ]);

      const ipFailed = (ipCount ?? 0) >= MAX_FAILED_ATTEMPTS;
      const emailFailed = (emailCount ?? 0) >= MAX_FAILED_ATTEMPTS;

      if (ipFailed || emailFailed) {
        const ttl = Math.max(ipTtl ?? 0, emailTtl ?? 0, 1);
        return { isLockedOut: true, retryAfterSeconds: ttl };
      }
      return { isLockedOut: false, retryAfterSeconds: 0 };
    } catch (err) {
      console.warn("[RateLimit] Redis get error, using memory fallback:", err);
    }
  }

  // Memory fallback
  const ipRecord = getMemoryRecord(ipKey);
  const emailRecord = getMemoryRecord(emailKey);

  const ipFailed = (ipRecord?.count ?? 0) >= MAX_FAILED_ATTEMPTS;
  const emailFailed = (emailRecord?.count ?? 0) >= MAX_FAILED_ATTEMPTS;

  if (ipFailed || emailFailed) {
    const now = Date.now();
    const resetTime = Math.max(ipRecord?.resetTime ?? 0, emailRecord?.resetTime ?? 0);
    const retryAfter = Math.max(1, Math.ceil((resetTime - now) / 1000));
    return { isLockedOut: true, retryAfterSeconds: retryAfter };
  }

  return { isLockedOut: false, retryAfterSeconds: 0 };
}

/**
 * Records a failed login attempt for both IP and email.
 */
export async function recordFailedLogin(
  ip: string,
  email: string
): Promise<{ isLockedOut: boolean; attempts: number }> {
  const ipKey = normalizeKey("ip", ip);
  const emailKey = normalizeKey("email", email);

  if (redisClient) {
    try {
      const [newIpCount, newEmailCount] = await Promise.all([
        redisClient.incr(ipKey),
        redisClient.incr(emailKey),
      ]);

      if (newIpCount === 1) await redisClient.expire(ipKey, LOCKOUT_WINDOW_SECONDS);
      if (newEmailCount === 1) await redisClient.expire(emailKey, LOCKOUT_WINDOW_SECONDS);

      const maxCount = Math.max(newIpCount, newEmailCount);
      return {
        isLockedOut: maxCount >= MAX_FAILED_ATTEMPTS,
        attempts: maxCount,
      };
    } catch (err) {
      console.warn("[RateLimit] Redis incr error, using memory fallback:", err);
    }
  }

  // Memory fallback
  const ipRecord = getMemoryRecord(ipKey);
  const emailRecord = getMemoryRecord(emailKey);

  const nextIpCount = (ipRecord?.count ?? 0) + 1;
  const nextEmailCount = (emailRecord?.count ?? 0) + 1;

  setMemoryRecord(ipKey, nextIpCount, LOCKOUT_WINDOW_MS);
  setMemoryRecord(emailKey, nextEmailCount, LOCKOUT_WINDOW_MS);

  const maxCount = Math.max(nextIpCount, nextEmailCount);
  return {
    isLockedOut: maxCount >= MAX_FAILED_ATTEMPTS,
    attempts: maxCount,
  };
}

/**
 * Clears failed login counter upon successful authentication.
 */
export async function clearFailedLogins(ip: string, email: string): Promise<void> {
  const ipKey = normalizeKey("ip", ip);
  const emailKey = normalizeKey("email", email);

  if (redisClient) {
    try {
      await Promise.all([
        redisClient.del(ipKey),
        redisClient.del(emailKey),
      ]);
    } catch (err) {
      console.warn("[RateLimit] Redis del error:", err);
    }
  }

  memoryStore.delete(ipKey);
  memoryStore.delete(emailKey);
}

/**
 * Helper for unit tests to reset rate limiter memory cache.
 */
export function resetRateLimitsForTesting(): void {
  memoryStore.clear();
}
