import { z } from "zod";

import type { Context } from "../trpc.js";
import { protectedProcedure, router } from "../trpc.js";

interface Bucket {
  name: string;
  value: number;
}

function toMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
}

function calculateGrowthRate(current: number, previous: number | null): number {
  if (previous === null || previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function withPercentages(items: Bucket[], total: number) {
  return items.map((item) => ({
    ...item,
    percentage: total > 0 ? (item.value / total) * 100 : 0,
  }));
}

async function computeNetWorthTotals(ctx: Context, userId: string) {
  const [accounts, stocks, investments, goals, debts] = await Promise.all([
    ctx.db.account.findMany({
      where: { userId, isActive: true },
      select: { balance: true },
    }),
    ctx.db.stock.findMany({
      where: { userId },
      select: { currentValue: true },
    }),
    ctx.db.investment.findMany({
      where: { userId },
      select: { currentValue: true },
    }),
    ctx.db.savingsGoal.findMany({
      where: { userId },
      select: { currentAmount: true },
    }),
    ctx.db.debt.findMany({
      where: { userId },
      select: { remaining: true, type: true },
    }),
  ]);

  const accountsTotal = accounts.reduce((sum, item) => sum + item.balance, 0);
  const stocksTotal = stocks.reduce((sum, item) => sum + item.currentValue, 0);
  const investmentsTotal = investments.reduce((sum, item) => sum + item.currentValue, 0);
  const goalsTotal = goals.reduce((sum, item) => sum + item.currentAmount, 0);

  const liabilitiesByType = new Map<string, number>();
  for (const debt of debts) {
    const current = liabilitiesByType.get(debt.type) ?? 0;
    liabilitiesByType.set(debt.type, current + debt.remaining);
  }

  const liabilitiesTotal = debts.reduce((sum, item) => sum + item.remaining, 0);
  const assetsTotal = accountsTotal + stocksTotal + investmentsTotal + goalsTotal;
  const netWorth = assetsTotal - liabilitiesTotal;

  return {
    assetsTotal,
    liabilitiesTotal,
    netWorth,
    assetsBuckets: [
      { name: "Accounts", value: accountsTotal },
      { name: "Stocks", value: stocksTotal },
      { name: "Investments", value: investmentsTotal },
      { name: "Savings Goals", value: goalsTotal },
    ],
    liabilitiesBuckets: Array.from(liabilitiesByType.entries()).map(([name, value]) => ({
      name,
      value,
    })),
  };
}

export const netWorthRouter = router({
  calculateNetWorth: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const monthStart = toMonthStart(new Date());

    const [totals, previousSnapshot] = await Promise.all([
      computeNetWorthTotals(ctx, userId),
      ctx.db.netWorthSnapshot.findFirst({
        where: {
          userId,
          monthStart: { lt: monthStart },
        },
        orderBy: { monthStart: "desc" },
        select: { netWorth: true, monthStart: true },
      }),
    ]);

    const growthRate = calculateGrowthRate(totals.netWorth, previousSnapshot?.netWorth ?? null);
    const growthAmount =
      previousSnapshot?.netWorth !== undefined ? totals.netWorth - previousSnapshot.netWorth : 0;

    return {
      asOf: new Date(),
      monthStart,
      assetsTotal: totals.assetsTotal,
      liabilitiesTotal: totals.liabilitiesTotal,
      netWorth: totals.netWorth,
      growthRate,
      growthAmount,
      previousNetWorth: previousSnapshot?.netWorth ?? null,
      previousMonthStart: previousSnapshot?.monthStart ?? null,
      assetsBreakdown: withPercentages(totals.assetsBuckets, totals.assetsTotal),
      liabilitiesBreakdown: withPercentages(totals.liabilitiesBuckets, totals.liabilitiesTotal),
    };
  }),

  getNetWorthHistory: protectedProcedure
    .input(
      z.object({
        months: z.number().int().min(1).max(120).default(24),
        includeCurrent: z.boolean().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const monthStart = toMonthStart(new Date());

      const snapshotsDesc = await ctx.db.netWorthSnapshot.findMany({
        where: { userId },
        orderBy: { monthStart: "desc" },
        take: input.months,
      });

      const snapshots = snapshotsDesc.slice().reverse();
      const hasCurrentSnapshot = snapshots.some(
        (item) => item.monthStart.getTime() === monthStart.getTime(),
      );

      let history = snapshots.map((item, index) => {
        const previous = index > 0 ? snapshots[index - 1] : null;
        return {
          id: item.id,
          monthStart: item.monthStart,
          label: formatMonthLabel(item.monthStart),
          assets: item.assets,
          liabilities: item.liabilities,
          netWorth: item.netWorth,
          growthRate: calculateGrowthRate(item.netWorth, previous?.netWorth ?? null),
          isSnapshot: true,
        };
      });

      if (input.includeCurrent && !hasCurrentSnapshot) {
        const totals = await computeNetWorthTotals(ctx, userId);
        const previous = history.length > 0 ? history[history.length - 1] : null;
        const livePoint = {
          id: "live-current",
          monthStart,
          label: formatMonthLabel(monthStart),
          assets: totals.assetsTotal,
          liabilities: totals.liabilitiesTotal,
          netWorth: totals.netWorth,
          growthRate: calculateGrowthRate(totals.netWorth, previous?.netWorth ?? null),
          isSnapshot: false,
        };

        history = [...history, livePoint].slice(-input.months);
      }

      return { items: history };
    }),

  createMonthlySnapshot: protectedProcedure
    .input(
      z.object({
        monthStart: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const targetMonthStart = toMonthStart(input.monthStart ?? new Date());
      const previousSnapshot = await ctx.db.netWorthSnapshot.findFirst({
        where: {
          userId,
          monthStart: { lt: targetMonthStart },
        },
        orderBy: { monthStart: "desc" },
        select: { netWorth: true },
      });

      const totals = await computeNetWorthTotals(ctx, userId);
      const growthRate = calculateGrowthRate(totals.netWorth, previousSnapshot?.netWorth ?? null);

      const snapshot = await ctx.db.netWorthSnapshot.upsert({
        where: {
          userId_monthStart: {
            userId,
            monthStart: targetMonthStart,
          },
        },
        create: {
          userId,
          monthStart: targetMonthStart,
          assets: totals.assetsTotal,
          liabilities: totals.liabilitiesTotal,
          netWorth: totals.netWorth,
          growthRate,
        },
        update: {
          assets: totals.assetsTotal,
          liabilities: totals.liabilitiesTotal,
          netWorth: totals.netWorth,
          growthRate,
        },
      });

      return snapshot;
    }),
});
