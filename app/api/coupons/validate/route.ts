import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = (body.code ?? "").trim().toUpperCase();
    const subtotal = Number(body.subtotal ?? 0);

    if (!code) {
      return NextResponse.json(
        { valid: false, error: "Please enter a promo code." },
        { status: 400 }
      );
    }

    const coupons = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "coupons" WHERE UPPER("code") = $1 LIMIT 1`,
      code
    );

    const coupon = coupons[0];

    if (!coupon || !coupon.isActive) {
      return NextResponse.json(
        { valid: false, error: "Invalid or expired promo code." },
        { status: 404 }
      );
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json(
        { valid: false, error: "This promo code has expired." },
        { status: 400 }
      );
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json(
        { valid: false, error: "This promo code has reached its maximum usage limit." },
        { status: 400 }
      );
    }

    const minSubtotal = Number(coupon.minSubtotal);
    if (subtotal < minSubtotal) {
      return NextResponse.json(
        {
          valid: false,
          error: `This coupon requires a minimum subtotal of $${minSubtotal.toFixed(2)}.`,
        },
        { status: 400 }
      );
    }

    // Calculate discount amount
    let discountAmount = 0;
    const value = Number(coupon.discountValue);

    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = (subtotal * value) / 100;
    } else {
      discountAmount = Math.min(value, subtotal);
    }

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: value,
      discountAmount: Number(discountAmount.toFixed(2)),
    });
  } catch (error) {
    console.error("[Coupon Validate Error]:", error);
    return NextResponse.json(
      { valid: false, error: "Unable to validate coupon code." },
      { status: 500 }
    );
  }
}
