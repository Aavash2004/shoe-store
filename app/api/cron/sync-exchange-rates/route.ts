import { NextRequest, NextResponse } from "next/server";
import { syncExchangeRates } from "@/lib/services/exchangeRates";

export const dynamic = "force-dynamic";

async function handleSync(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  // Enforce CRON_SECRET authorization in production
  if (process.env.NODE_ENV === "production") {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized cron execution" },
        { status: 401 }
      );
    }
  }

  const startTime = Date.now();
  const result = await syncExchangeRates("CRON_SCHEDULER");
  const durationMs = Date.now() - startTime;

  if (!result.success) {
    return NextResponse.json(
      {
        message: "Failed to sync exchange rates",
        error: result.error,
        durationMs,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Exchange rates synchronized successfully",
    rates: result.rates,
    durationMs,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}
