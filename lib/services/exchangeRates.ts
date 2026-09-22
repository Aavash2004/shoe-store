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

export const OpenErApiResponseSchema = z.object({
  result: z.literal("success"),
  base_code: z.literal("USD"),
  rates: z.record(z.string(), z.number()),
  time_last_update_utc: z.string().optional(),
});

export type OpenErApiResponse = z.infer<typeof OpenErApiResponseSchema>;

export interface LiveRatesResult {
  NPR: number;
  GBP: number;
  EUR: number;
  USD: number;
}

// 36 hours staleness limit in milliseconds
const MAX_CACHE_AGE_MS = 36 * 60 * 60 * 1000;

// In-memory cache for serverless instance reuse (10-minute TTL)
let memoryCache: {
  rates: Record<string, number>;
  timestamp: number;
} | null = null;
const MEMORY_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Fetch live exchange rates from open.er-api.com with strict Zod validation.
 * Aborts cleanly on network failure, timeout, or schema drift.
 */
export async function fetchLiveRates(timeoutMs: number = 5000): Promise<LiveRatesResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Open ER API responded with HTTP status ${res.status}`);
    }

    const json = await res.json();
    const parsed = OpenErApiResponseSchema.safeParse(json);

    if (!parsed.success) {
      throw new Error(
        `Open ER API schema validation failed: ${parsed.error.issues.map((i) => i.message).join(", ")}`
      );
    }

    const { rates } = parsed.data;

    // Validate that each target rate exists and is a positive finite number
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
 * Scheduled sync worker: Fetches live rates and upserts them into Postgres.
 * Safe under concurrent execution via unique constraint upsert.
 */
export async function syncExchangeRates(callerId?: string): Promise<{
  success: boolean;
  rates?: LiveRatesResult;
  error?: string;
}> {
  try {
    const liveRates = await fetchLiveRates();

    // Idempotent upsert by unique currency code
    await prisma.$transaction(
      SYNCED_CURRENCIES.map((currency) =>
        prisma.exchangeRate.upsert({
          where: { currency },
          update: {
            rateToBaseUSD: liveRates[currency],
            source: "OPEN_ER_API",
            updatedAt: new Date(),
          },
          create: {
            currency,
            rateToBaseUSD: liveRates[currency],
            source: "OPEN_ER_API",
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
    };

    return { success: true, rates: liveRates };
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
