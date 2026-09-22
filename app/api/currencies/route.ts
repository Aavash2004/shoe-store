import { NextResponse } from "next/server";
import { getExchangeRates } from "@/lib/services/exchangeRates";
import { CURRENCIES } from "@/lib/constants/currencies";

export const dynamic = "force-dynamic";

export async function GET() {
  const rates = await getExchangeRates();

  return NextResponse.json({
    base: "USD",
    rates,
    currencies: CURRENCIES,
    timestamp: new Date().toISOString(),
  });
}
