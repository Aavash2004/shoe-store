import { NextRequest, NextResponse } from "next/server";
import { getExchangeRates, syncExchangeRates } from "@/lib/services/exchangeRates";
import { CURRENCIES } from "@/lib/constants/currencies";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const shouldRefresh = request.nextUrl.searchParams.get("refresh") === "true";

  if (shouldRefresh) {
    await syncExchangeRates("CLIENT_REFRESH");
  }

  const rates = await getExchangeRates();
  const apiKeyConfigured = Boolean(
    (process.env.EXCHANGERATE_API_KEY || process.env.EXCHANGE_RATE_API_KEY)?.trim()
  );

  return NextResponse.json({
    base: "USD",
    rates,
    currencies: CURRENCIES,
    provider: apiKeyConfigured
      ? "ExchangeRate-API (v6 Pro/Standard)"
      : "ExchangeRate-API (Open Public)",
    apiKeyConfigured,
    timestamp: new Date().toISOString(),
  });
}
