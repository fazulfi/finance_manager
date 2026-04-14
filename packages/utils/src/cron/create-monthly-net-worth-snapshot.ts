// packages/utils/src/cron/create-monthly-net-worth-snapshot.ts
// Monthly scheduled job — creates/upserts net worth snapshots for all users.
// Run with: npx tsx packages/utils/src/cron/create-monthly-net-worth-snapshot.ts
// Schedule suggestion (UTC): "5 0 1 * *" (00:05 on the 1st of each month)

import { db } from "@finance/db";

function toMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function calculateGrowthRate(current: number, previous: number | null): number {
  if (previous === null || previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

async function calculateNetWorthForUser(userId: string) {
  const [accounts, stocks, investments, goals, debts] = await Promise.all([
    db.account.findMany({
      where: { userId, isActive: true },
      select: { balance: true },
    }),
    db.stock.findMany({
      where: { userId },
      select: { currentValue: true },
    }),
    db.investment.findMany({
      where: { userId },
      select: { currentValue: true },
    }),
    db.savingsGoal.findMany({
      where: { userId },
      select: { currentAmount: true },
    }),
    db.debt.findMany({
      where: { userId },
      select: { remaining: true },
    }),
  ]);

  const assets =
    accounts.reduce((sum, item) => sum + item.balance, 0) +
    stocks.reduce((sum, item) => sum + item.currentValue, 0) +
    investments.reduce((sum, item) => sum + item.currentValue, 0) +
    goals.reduce((sum, item) => sum + item.currentAmount, 0);

  const liabilities = debts.reduce((sum, item) => sum + item.remaining, 0);
  const netWorth = assets - liabilities;

  return { assets, liabilities, netWorth };
}

async function createMonthlyNetWorthSnapshots(): Promise<void> {
  const startedAt = new Date();
  const monthStart = toMonthStart(startedAt);
  console.log(
    `[net-worth-snapshot] Starting run at ${startedAt.toISOString()} for ${monthStart.toISOString()}`,
  );

  const users = await db.user.findMany({
    select: { id: true },
  });

  if (users.length === 0) {
    console.log("[net-worth-snapshot] No users found. Nothing to snapshot.");
    return;
  }

  let successCount = 0;
  let failedCount = 0;

  for (const user of users) {
    try {
      const [totals, previousSnapshot] = await Promise.all([
        calculateNetWorthForUser(user.id),
        db.netWorthSnapshot.findFirst({
          where: {
            userId: user.id,
            monthStart: { lt: monthStart },
          },
          orderBy: { monthStart: "desc" },
          select: { netWorth: true },
        }),
      ]);

      const growthRate = calculateGrowthRate(totals.netWorth, previousSnapshot?.netWorth ?? null);

      await db.netWorthSnapshot.upsert({
        where: {
          userId_monthStart: {
            userId: user.id,
            monthStart,
          },
        },
        create: {
          userId: user.id,
          monthStart,
          assets: totals.assets,
          liabilities: totals.liabilities,
          netWorth: totals.netWorth,
          growthRate,
        },
        update: {
          assets: totals.assets,
          liabilities: totals.liabilities,
          netWorth: totals.netWorth,
          growthRate,
        },
      });

      successCount += 1;
    } catch (error) {
      failedCount += 1;
      console.error(
        `[net-worth-snapshot] Failed for user ${user.id}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  console.log(
    `[net-worth-snapshot] Done. Success=${successCount}, Failed=${failedCount}, Total=${users.length}`,
  );
}

createMonthlyNetWorthSnapshots()
  .catch((error) => {
    console.error("[net-worth-snapshot] Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
