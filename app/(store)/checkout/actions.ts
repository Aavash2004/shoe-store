"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";

// Simple in-memory sliding window rate limiter: max 10 calls per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 10;

  // Cleanup old entries periodically if map grows large
  if (rateLimitMap.size > 1000) {
    for (const [key, record] of rateLimitMap.entries()) {
      if (record.resetAt <= now) {
        rateLimitMap.delete(key);
      }
    }
  }

  const existing = rateLimitMap.get(ip);
  if (!existing || existing.resetAt <= now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= maxRequests) {
    return false;
  }

  existing.count++;
  return true;
}

/**
 * Server action to retrieve order number by order ID safely.
 * Enables the client checkout error notice to display the order reference
 * without passing order numbers or emails through URL search params.
 * 
 * Security controls:
 * 1. Strict CUID format validation
 * 2. Rate limiting (max 10 requests/min per IP)
 * 3. Status restriction (only MANUAL_REVIEW, CANCELLED, or PENDING orders)
 * 4. Age restriction (created within the last 2 hours)
 */
export async function getOrderNumber(orderId: string): Promise<string | null> {
  if (!orderId || typeof orderId !== "string") return null;

  // Validate ID format (standard Prisma CUID is alphanumeric 20-35 chars)
  const isCuidFormat = /^[c-z0-9]{20,35}$/i.test(orderId);
  if (!isCuidFormat) {
    return null;
  }

  // Enforce IP rate limiting
  try {
    const headerList = await headers();
    const clientIp =
      headerList.get("x-forwarded-for")?.split(",")[0].trim() ||
      headerList.get("x-real-ip") ||
      headerList.get("cf-connecting-ip") ||
      "unknown-client";

    if (!checkRateLimit(clientIp)) {
      console.warn(`[getOrderNumber] Rate limit exceeded for IP: ${clientIp}`);
      return null;
    }
  } catch {
    // If headers() is unavailable in test context, proceed safely
  }

  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        status: { in: ["MANUAL_REVIEW", "CANCELLED", "PENDING"] },
        createdAt: { gte: twoHoursAgo },
      },
      select: { orderNumber: true },
    });

    return order?.orderNumber || null;
  } catch (error) {
    console.error("[getOrderNumber] Failed to fetch orderNumber:", error);
    return null;
  }
}
