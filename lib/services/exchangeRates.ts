import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { CURRENCIES, CurrencyConfig } from "@/lib/constants/currencies";

/**
 * Currency Scope Notes:
 * - USD: Anchoring base catalog currency. It is implicitly 1.0 and does not require an ExchangeRate row.
 * - NPR: Primary domestic Nepal checkout currency (COD & Khalti).
 * - GBP: Supported international checkout currency (Stripe).
 * - EUR: Supported for storefront browsing/display and future EU expansion.
 *        Note: Checkout eligibility remains gated by lib/constants/countries.ts (NP, US, GB).
 */
export const SYNCED_CURRENCIES = ["NPR", "GBP", "EUR"] as const;
export type SyncedCurrency = (typeof SYNCED_CURRENCIES)[number];

export const ExchangeRateApiResponseSchema = z.object({
  result: z.literal("success"),
  base_code: z.literal("USD"),
  rates: z.record(z.string(), z.number()).optional(),
  conversion_rates: z.record(z.string(), z.number()).optional(),
  time_last_update_utc: z.string().optional(),
  time_last_update_unix: z.number().optional(),
});

export type ExchangeRateApiResponse = z.infer<typeof ExchangeRateApiResponseSchema>;

// Backwards-compatible alias for existing tests and callers
export const OpenErApiResponseSchema = ExchangeRateApiResponseSchema;
export type OpenErApiResponse = ExchangeRateApiResponse;

export interface LiveRatesResult {
  NPR: number;
  GBP: number;
  EUR: number;
  USD: number;
  source?: string;
  provider?: string;
}

// 36 hours staleness limit in milliseconds
const MAX_CACHE_AGE_MS = 36 * 60 * 60 * 1000;

// In-memory cache for serverless instance reuse (10-minute TTL)
let memoryCache: {
  rates: Record<string, number>;
  timestamp: number;
  source?: string;
} | null = null;
const MEMORY_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Helper to fetch and parse exchange rates from a given URL with timeout and Zod validation.
 */
async function fetchFromEndpoint(
  url: string,
  timeoutMs: number
): Promise<{ NPR: number; GBP: number; EUR: number; USD: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`ExchangeRate API responded with HTTP status ${res.status}`);
    }

    const json = await res.json();
    const parsed = ExchangeRateApiResponseSchema.safeParse(json);

    if (!parsed.success) {
      throw new Error(
        `ExchangeRate API schema validation failed: ${parsed.error.issues.map((i) => i.message).join(", ")}`
      );
    }

    // Support both conversion_rates (v6 with API key) and rates (open endpoint)
    const rates = parsed.data.conversion_rates || parsed.data.rates;
    if (!rates) {
      throw new Error("No rate dictionary (conversion_rates/rates) found in API response");
    }

    // Validate that each target currency rate exists and is a positive finite number
    for (const cur of SYNCED_CURRENCIES) {
      const val = rates[cur];
      if (typeof val !== "number" || !Number.isFinite(val) || val <= 0) {
        throw new Error(`Invalid or non-positive rate received for ${cur}: ${val}`);
      }
    }

    return {
      USD: 1.0,
      NPR: rates.NPR,
      GBP: rates.GBP,
      EUR: rates.EUR,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch live exchange rates from ExchangeRate-API (https://app.exchangerate-api.com/dashboard).
 * Uses EXCHANGERATE_API_KEY if present, with automatic fallback to open.er-api.com.
 */
export async function fetchLiveRates(timeoutMs: number = 6000): Promise<LiveRatesResult> {
  const rawKey = process.env.EXCHANGERATE_API_KEY || process.env.EXCHANGE_RATE_API_KEY;
  const apiKey = rawKey?.trim();

  // 1. If user has an ExchangeRate-API key configured, query the v6 authenticated endpoint
  if (apiKey) {
    try {
      const live = await fetchFromEndpoint(
        `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`,
        timeoutMs
      );
      return {
        ...live,
        source: "EXCHANGERATE_API",
        provider: "ExchangeRate-API (v6 Pro/Standard)",
      };
    } catch (err: any) {
      console.warn(
        `[ExchangeRate-API] Authenticated endpoint error (${err?.message}). Falling back to open endpoint.`
      );
    }
  }

  // 2. Open fallback endpoint (ExchangeRate-API public open tier)
  const fallback = await fetchFromEndpoint("https://open.er-api.com/v6/latest/USD", timeoutMs);
  return {
    ...fallback,
    source: apiKey ? "EXCHANGERATE_API_FALLBACK" : "OPEN_ER_API",
    provider: apiKey ? "ExchangeRate-API (Open Fallback)" : "ExchangeRate-API (Open Public)",
  };
}

/**
 * Scheduled sync worker: Fetches live rates and upserts them into Postgres.
 * Safe under concurrent execution via unique constraint upsert.
 */
export async function syncExchangeRates(callerId?: string): Promise<{
  success: boolean;
  rates?: LiveRatesResult;
  source?: string;
  error?: string;
}> {
  try {
    const liveRates = await fetchLiveRates();
    const source = liveRates.source || "EXCHANGERATE_API";

    // Idempotent upsert by unique currency code
    await prisma.$transaction(
      SYNCED_CURRENCIES.map((currency) =>
        prisma.exchangeRate.upsert({
          where: { currency },
          update: {
            rateToBaseUSD: liveRates[currency],
            source,
            updatedAt: new Date(),
          },
          create: {
            currency,
            rateToBaseUSD: liveRates[currency],
            source,
          },
        })
      )
    );

    // Invalidate local in-memory cache
    memoryCache = {
      rates: {
        USD: 1.0,
        NPR: liveRates.NPR,
        GBP: liveRates.GBP,
        EUR: liveRates.EUR,
      },
      timestamp: Date.now(),
      source,
    };

    return { success: true, rates: liveRates, source };
  } catch (err: any) {
    const errorMessage = err?.message || "Unknown exchange rate sync error";
    console.error("[ExchangeRate Sync Error]:", errorMessage);

    // Record audit failure log in database for admin visibility
    try {
      const adminUser = await prisma.user.findFirst({
        where: { role: "ADMIN" },
        select: { id: true },
      });

      if (adminUser) {
        await prisma.adminActivityLog.create({
          data: {
            adminId: callerId || adminUser.id,
            action: "EXCHANGE_RATE_SYNC_FAILED",
            entity: "ExchangeRate",
            entityId: "CRON_SYNC",
            metadata: {
              error: errorMessage,
              timestamp: new Date().toISOString(),
            },
          },
        });
      }
    } catch (logErr) {
      console.warn("[ExchangeRate Log Failure]:", logErr);
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Get active exchange rates.
 * ZERO external HTTP requests: Reads from in-memory cache -> PostgreSQL -> static baseline.
 * Enforces a 36-hour staleness threshold on the database cache.
 */
export async function getExchangeRates(
  dbClient: any = prisma
): Promise<Record<string, number>> {
  // 1. In-memory hot cache check
  if (memoryCache && Date.now() - memoryCache.timestamp < MEMORY_CACHE_TTL_MS) {
    return memoryCache.rates;
  }

  // 2. Query Postgres exchange_rates cache
  try {
    const rows = await dbClient.exchangeRate.findMany();

    if (!rows || rows.length === 0) {
      // Auto-initialize from ExchangeRate-API on first access
      const syncResult = await syncExchangeRates("AUTO_INIT");
      if (syncResult.success && syncResult.rates) {
        return {
          USD: 1.0,
          NPR: syncResult.rates.NPR,
          GBP: syncResult.rates.GBP,
          EUR: syncResult.rates.EUR,
        };
      }
      return getStaticBaselineRates();
    }

    if (rows && rows.length > 0) {
      // Check staleness against the oldest or newest entry
      const newestUpdated = Math.max(
        ...rows.map((r: any) => new Date(r.updatedAt).getTime())
      );
      const isStale = Date.now() - newestUpdated > MAX_CACHE_AGE_MS;

      if (isStale) {
        console.warn(
          `[ExchangeRate Alert] Cached rates are >36h stale (last updated: ${new Date(
            newestUpdated
          ).toISOString()}). Falling back to static pegs.`
        );

        // Record staleness alert in AdminActivityLog
        try {
          const adminUser = await dbClient.user.findFirst({
            where: { role: "ADMIN" },
            select: { id: true },
          });
          if (adminUser) {
            await dbClient.adminActivityLog.create({
              data: {
                adminId: adminUser.id,
                action: "EXCHANGE_RATE_CACHE_STALE_ALERT",
                entity: "ExchangeRate",
                entityId: "SYSTEM_CHECKOUT",
                metadata: {
                  lastUpdated: new Date(newestUpdated).toISOString(),
                  ageHours: Math.round((Date.now() - newestUpdated) / (1000 * 60 * 60)),
                },
              },
            });
          }
        } catch {}

        return getStaticBaselineRates();
      }

      // Build validated rate dictionary
      const rateMap: Record<string, number> = {
        USD: 1.0, // Implicit base anchor
      };

      for (const row of rows) {
        rateMap[row.currency] = Number(row.rateToBaseUSD);
      }

      // Fallback for any missing currency
      for (const cur of SYNCED_CURRENCIES) {
        if (!rateMap[cur]) {
          rateMap[cur] = CURRENCIES[cur]?.rateToBaseUSD || 1.0;
        }
      }

      // Update memory cache
      memoryCache = {
        rates: rateMap,
        timestamp: Date.now(),
      };

      return rateMap;
    }
  } catch (dbErr) {
    console.warn("[ExchangeRate DB Read Warning]:", dbErr);
  }

  // 3. Static baseline fallback
  return getStaticBaselineRates();
}

/**
 * Returns verified static baseline pegs from lib/constants/currencies.ts.
 */
export function getStaticBaselineRates(): Record<string, number> {
  return {
    USD: 1.0,
    NPR: CURRENCIES.NPR?.rateToBaseUSD ?? 135.0,
    GBP: CURRENCIES.GBP?.rateToBaseUSD ?? 0.78,
    EUR: CURRENCIES.EUR?.rateToBaseUSD ?? 0.92,
  };
}

/**
 * Invalidate in-memory cache (used for unit testing or forced refresh).
 */
export function clearExchangeRateMemoryCache(): void {
  memoryCache = null;
}
