import { prisma } from "@/lib/db/prisma";
import { AdminCouponsClient } from "./AdminCouponsClient";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  let coupons: any[] = [];
  try {
    coupons = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "coupons" ORDER BY "createdAt" DESC`
    );
  } catch (err) {
    console.error("[AdminCouponsPage DB Error]:", err);
    coupons = [];
  }

  const formattedCoupons = coupons.map((c: any) => ({
    id: c.id,
    code: c.code,
    discountType: c.discountType,
    discountValue: Number(c.discountValue),
    minSubtotal: Number(c.minSubtotal),
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    isActive: Boolean(c.isActive),
    expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString() : null,
    createdAt: new Date(c.createdAt).toISOString(),
  }));

  return <AdminCouponsClient coupons={formattedCoupons} />;
}
