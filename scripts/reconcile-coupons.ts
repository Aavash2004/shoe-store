import { prisma } from "../lib/db/prisma";

interface CouponReconcileRow {
  code: string;
  currentUsedCount: number;
  actualUsedCount: number;
  diff: number;
  status: "IN_SYNC" | "OUT_OF_SYNC";
}

async function main() {
  const isApply = process.argv.includes("--apply");
  const mode = isApply ? "APPLY (WRITING TO DB)" : "DRY RUN (READ-ONLY)";

  console.log(`=======================================================`);
  console.log(` COUPON RECONCILIATION WORKER`);
  console.log(` Mode: ${mode}`);
  console.log(` Timestamp: ${new Date().toISOString()}`);
  console.log(`=======================================================\n`);

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "asc" },
  });

  if (coupons.length === 0) {
    console.log("No coupons found in database.");
    await prisma.$disconnect();
    return;
  }

  const rows: CouponReconcileRow[] = [];
  let outOfSyncCount = 0;

  for (const coupon of coupons) {
    // Count non-cancelled orders associated with this coupon
    const nonCancelledCount = await prisma.order.count({
      where: {
        OR: [
          { couponId: coupon.id },
          { couponCode: { equals: coupon.code, mode: "insensitive" } },
        ],
        status: { not: "CANCELLED" },
      },
    });

    const diff = nonCancelledCount - coupon.usedCount;
    const isOutOfSync = diff !== 0;

    if (isOutOfSync) {
      outOfSyncCount++;
    }

    rows.push({
      code: coupon.code,
      currentUsedCount: coupon.usedCount,
      actualUsedCount: nonCancelledCount,
      diff,
      status: isOutOfSync ? "OUT_OF_SYNC" : "IN_SYNC",
    });
  }

  // Format and print diff table
  console.log(
    `| ${"Coupon Code".padEnd(20)} | ${"Current".padStart(8)} | ${"Reconciled".padStart(10)} | ${"Diff".padStart(6)} | ${"Status".padEnd(12)} |`
  );
  console.log(
    `|${"-".repeat(22)}|${"-".repeat(10)}|${"-".repeat(12)}|${"-".repeat(8)}|${"-".repeat(14)}|`
  );

  for (const row of rows) {
    const diffStr = row.diff > 0 ? `+${row.diff}` : `${row.diff}`;
    console.log(
      `| ${row.code.padEnd(20)} | ${String(row.currentUsedCount).padStart(8)} | ${String(row.actualUsedCount).padStart(10)} | ${diffStr.padStart(6)} | ${row.status.padEnd(12)} |`
    );
  }

  console.log(`\nEvaluated ${coupons.length} coupon(s). Found ${outOfSyncCount} out of sync.`);

  if (isApply) {
    if (outOfSyncCount > 0) {
      console.log(`\nApplying updates to ${outOfSyncCount} coupon(s)...`);
      for (const row of rows) {
        if (row.diff !== 0) {
          await prisma.coupon.update({
            where: { code: row.code },
            data: { usedCount: row.actualUsedCount },
          });
          console.log(`  Updated ${row.code}: usedCount ${row.currentUsedCount} -> ${row.actualUsedCount}`);
        }
      }
      console.log(`\n✅ Successfully reconciled and updated all coupons in the database.`);
    } else {
      console.log(`\n✅ All coupons are already in sync. No database updates required.`);
    }
  } else {
    console.log(
      `\n🔎 Dry-run mode: No modifications made to database. Run with '--apply' to commit changes.`
    );
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Coupon reconciliation error:", err);
  await prisma.$disconnect();
  process.exit(1);
});
