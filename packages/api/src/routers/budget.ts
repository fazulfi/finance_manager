// packages/api/src/routers/budget.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { router, protectedProcedure, objectId } from "../trpc.js";
function calculateBudgetStatus(spent: number, budgeted: number) {
  const percentage = budgeted > 0 ? Math.min(100, Math.round((spent / budgeted) * 100)) : 0;
  const status = percentage >= 100 ? "OVER_BUDGET" : percentage >= 75 ? "WARNING" : "ON_TRACK";
  return { percentage, status };
}

const BudgetTypeEnum = z.enum(["MONTHLY", "ANNUAL", "CUSTOM"]);
const BudgetPeriodEnum = z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]);

const BudgetItemSchema = z.object({
  categoryId: objectId,
  name: z.string().min(1).max(200),
  budgeted: z.number().positive(),
});

export const budgetRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        ctx.db.budget.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.budget.count({ where: { userId } }),
      ]);

      return { items, total, page, limit };
    }),

  getById: protectedProcedure.input(z.object({ id: objectId })).query(async ({ ctx, input }) => {
    const budget = await ctx.db.budget.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
    });
    if (!budget) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
    }
    return budget;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        type: BudgetTypeEnum,
        period: BudgetPeriodEnum,
        startDate: z.date(),
        endDate: z.date().optional(),
        items: z.array(BudgetItemSchema).max(50).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data: Parameters<typeof ctx.db.budget.create>[0]["data"] = {
        userId: ctx.session.user.id,
        name: input.name,
        type: input.type,
        period: input.period,
        startDate: input.startDate,
        items: input.items.map((item) => ({
          categoryId: item.categoryId,
          name: item.name,
          budgeted: item.budgeted,
          spent: 0,
        })),
      };
      if (input.endDate !== undefined) data.endDate = input.endDate;

      return ctx.db.budget.create({ data });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: objectId,
        name: z.string().min(1).max(100).optional(),
        type: BudgetTypeEnum.optional(),
        period: BudgetPeriodEnum.optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        items: z.array(BudgetItemSchema).max(50).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.budget.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
      }

      const data: Parameters<typeof ctx.db.budget.update>[0]["data"] = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.type !== undefined) data.type = input.type;
      if (input.period !== undefined) data.period = input.period;
      if (input.startDate !== undefined) data.startDate = input.startDate;
      if (input.endDate !== undefined) data.endDate = input.endDate;
      if (input.items !== undefined) {
        // Preserve existing spent values for items that match by categoryId
        const existingSpentMap = new Map(
          existing.items.map((item: { categoryId: string; spent: number }) => [
            item.categoryId,
            item.spent,
          ]),
        );
        data.items = input.items.map((item) => ({
          categoryId: item.categoryId,
          name: item.name,
          budgeted: item.budgeted,
          spent: existingSpentMap.get(item.categoryId) ?? 0,
        }));
      }

      return ctx.db.budget.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data,
      });
    }),

  delete: protectedProcedure.input(z.object({ id: objectId })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.budget.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
    });
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
    }
    await ctx.db.budget.delete({ where: { id: input.id, userId: ctx.session.user.id } });
    return { success: true };
  }),

  getProgress: protectedProcedure
    .input(z.object({ id: objectId }))
    .query(async ({ ctx, input }) => {
      // Fetch budget first so we can use its date range for the transaction query
      const budget = await ctx.db.budget.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        select: { items: true, startDate: true, endDate: true },
      });

      if (!budget) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
      }

      const transactions = await ctx.db.transaction.findMany({
        where: {
          userId: ctx.session.user.id,
          type: "EXPENSE",
          date: {
            gte: budget.startDate,
            lte: budget.endDate ?? new Date(),
          },
        },
        select: { category: true, amount: true },
      });

      // Build a category → total spent map in memory (noUncheckedIndexedAccess safe via ?? 0)
      const spentMap: Record<string, number> = {};
      for (const tx of transactions) {
        const current = spentMap[tx.category] ?? 0;
        spentMap[tx.category] = current + tx.amount;
      }

      // Helper function for robust category matching:
      // 1. Exact match (case-sensitive)
      // 2. Case-insensitive match
      // 3. Partial match (checks if item name is contained in transaction category or vice versa)
      const findCategorySpent = (
        categoryName: string,
        spentMap: Record<string, number>,
      ): number => {
        // Exact match first
        if (spentMap[categoryName] !== undefined) {
          return spentMap[categoryName];
        }

        // Case-insensitive match
        const lowerName = categoryName.toLowerCase();
        for (const [txCategory, amount] of Object.entries(spentMap)) {
          if (txCategory.toLowerCase() === lowerName) {
            return amount;
          }
        }

        // Partial match: check if item name is contained in transaction category or vice versa
        for (const [txCategory, amount] of Object.entries(spentMap)) {
          if (
            txCategory.toLowerCase().includes(lowerName) ||
            lowerName.includes(txCategory.toLowerCase())
          ) {
            return amount;
          }
        }

        return 0;
      };

      // Enrich each budget item with actual spent amount using robust matching.
      // TODO: Refactor matching when Transaction schema supports categoryId as a relation.
      const itemsWithProgress = budget.items.map(
        (item: { name: string; budgeted: number; spent: number; categoryId: string }) => {
          const spent = findCategorySpent(item.name, spentMap);
          return {
            ...item,
            actualSpent: spent,
            remaining: item.budgeted - spent,
            percentUsed: item.budgeted > 0 ? Math.round((spent / item.budgeted) * 100) : 0,
          };
        },
      );

      const totalBudgeted = budget.items.reduce((sum: number, item) => sum + item.budgeted, 0);
      const totalSpent = itemsWithProgress.reduce((sum: number, item) => sum + item.actualSpent, 0);

      return {
        ...budget,
        items: itemsWithProgress,
        totalBudgeted,
        totalSpent,
        totalRemaining: totalBudgeted - totalSpent,
      };
    }),

  // Get current budget status with alert thresholds
  getBudgetStatus: protectedProcedure
    .input(z.object({ id: objectId }))
    .query(async ({ ctx, input }) => {
      // Fetch budget first so we can use its date range for the transaction query
      const budget = await ctx.db.budget.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        select: {
          id: true,
          name: true,
          items: true,
          startDate: true,
          endDate: true,
        },
      });

      if (!budget) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
      }

      const transactions = await ctx.db.transaction.findMany({
        where: {
          userId: ctx.session.user.id,
          type: "EXPENSE",
          date: {
            gte: budget.startDate,
            lte: budget.endDate ?? new Date(),
          },
        },
        select: { category: true, amount: true },
      });

      const totalBudgeted = budget.items.reduce(
        (sum: number, item: { budgeted: number }) => sum + item.budgeted,
        0,
      );

      // Build category → total spent map in memory
      const spentMap: Record<string, number> = {};
      for (const tx of transactions) {
        const current = spentMap[tx.category] ?? 0;
        spentMap[tx.category] = current + tx.amount;
      }

      // Helper function for robust category matching:
      // 1. Exact match (case-sensitive)
      // 2. Case-insensitive match
      // 3. Partial match (checks if item name is contained in transaction category or vice versa)
      const findCategorySpent = (
        categoryName: string,
        spentMap: Record<string, number>,
      ): number => {
        // Exact match first
        if (spentMap[categoryName] !== undefined) {
          return spentMap[categoryName];
        }

        // Case-insensitive match
        const lowerName = categoryName.toLowerCase();
        for (const [txCategory, amount] of Object.entries(spentMap)) {
          if (txCategory.toLowerCase() === lowerName) {
            return amount;
          }
        }

        // Partial match: check if item name is contained in transaction category or vice versa
        for (const [txCategory, amount] of Object.entries(spentMap)) {
          if (
            txCategory.toLowerCase().includes(lowerName) ||
            lowerName.includes(txCategory.toLowerCase())
          ) {
            return amount;
          }
        }

        return 0;
      };

      // Calculate total spent using robust category matching
      const totalSpent = budget.items.reduce(
        (sum: number, item: { name: string }) => sum + findCategorySpent(item.name, spentMap),
        0,
      );

      // Calculate budget status
      const status = calculateBudgetStatus(totalSpent, totalBudgeted);

      return {
        budgetId: budget.id,
        name: budget.name,
        status: status.status,
        percentage: status.percentage,
        totalBudgeted,
        totalSpent,
        totalRemaining: totalBudgeted - totalSpent,
        startDate: budget.startDate,
        endDate: budget.endDate,
      };
    }),

  // Get budget history for comparison (current period + previous period)
  getHistory: protectedProcedure.input(z.object({ id: objectId })).query(async ({ ctx, input }) => {
    // Mitigation for race condition: fetch budget first, then transactions
    const budget = await ctx.db.budget.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        type: true,
        period: true,
        startDate: true,
        endDate: true,
        items: true,
      },
    });
    if (!budget) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
    }

    const totalBudgeted = budget.items.reduce(
      (sum: number, item: { budgeted: number }) => sum + item.budgeted,
      0,
    );

    // Helper function for robust category matching:
    // 1. Exact match (case-sensitive)
    // 2. Case-insensitive match
    // 3. Partial match (checks if item name is contained in transaction category or vice versa)
    const findCategorySpent = (categoryName: string, spentMap: Record<string, number>): number => {
      // Exact match first
      if (spentMap[categoryName] !== undefined) {
        return spentMap[categoryName];
      }

      // Case-insensitive match
      const lowerName = categoryName.toLowerCase();
      for (const [txCategory, amount] of Object.entries(spentMap)) {
        if (txCategory.toLowerCase() === lowerName) {
          return amount;
        }
      }

      // Partial match: check if item name is contained in transaction category or vice versa
      for (const [txCategory, amount] of Object.entries(spentMap)) {
        if (
          txCategory.toLowerCase().includes(lowerName) ||
          lowerName.includes(txCategory.toLowerCase())
        ) {
          return amount;
        }
      }

      return 0;
    };

    // Calculate current period spent
    const currentTransactions = await ctx.db.transaction.findMany({
      where: {
        userId: ctx.session.user.id,
        type: "EXPENSE",
        date: {
          gte: budget.startDate,
          lte: budget.endDate ?? new Date(),
        },
      },
      select: { category: true, amount: true },
    });

    const currentSpentMap: Record<string, number> = {};
    for (const tx of currentTransactions) {
      const current = currentSpentMap[tx.category] ?? 0;
      currentSpentMap[tx.category] = current + tx.amount;
    }

    const currentTotalSpent = budget.items.reduce(
      (sum: number, item) => sum + findCategorySpent(item.name, currentSpentMap),
      0,
    );

    // Calculate previous period spent
    let previousStartDate: Date;
    let previousEndDate: Date;

    // Determine previous period based on budget type
    if (budget.type === "MONTHLY" || budget.period === "MONTHLY") {
      const currentMonth = budget.startDate.getMonth();
      const currentYear = budget.startDate.getFullYear();
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      previousStartDate = new Date(prevYear, prevMonth, 1);
      previousEndDate = new Date(prevYear, prevMonth + 1, 0);
      previousEndDate.setHours(23, 59, 59, 999);
    } else if (budget.type === "ANNUAL" || budget.period === "YEARLY") {
      const prevYear = budget.startDate.getFullYear() - 1;
      previousStartDate = new Date(prevYear, 0, 1);
      previousEndDate = new Date(prevYear, 11, 31);
      previousEndDate.setHours(23, 59, 59, 999);
    } else if (budget.period === "QUARTERLY") {
      const quarter = Math.floor(budget.startDate.getMonth() / 3);
      const year = budget.startDate.getFullYear();
      const prevQuarter = quarter === 0 ? 3 : quarter - 1;
      const prevYear = quarter === 0 ? year - 1 : year;

      previousStartDate = new Date(prevYear, prevQuarter * 3, 1);
      previousEndDate = new Date(prevYear, prevQuarter * 3 + 3, 0);
      previousEndDate.setHours(23, 59, 59, 999);
    } else if (budget.period === "WEEKLY") {
      // Previous week (7 days before start)
      previousStartDate = new Date(budget.startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      previousEndDate = new Date(previousStartDate.getTime() + 6 * 24 * 60 * 60 * 1000);
      previousEndDate.setHours(23, 59, 59, 999);
    } else {
      // Custom period — use the same length but shifted by the original duration
      const durationMs = (budget.endDate ?? new Date()).getTime() - budget.startDate.getTime();
      previousStartDate = new Date(budget.startDate.getTime() - durationMs);
      previousEndDate = new Date(budget.startDate.getTime());
      previousEndDate.setHours(23, 59, 59, 999);
    }

    const previousTransactions = await ctx.db.transaction.findMany({
      where: {
        userId: ctx.session.user.id,
        type: "EXPENSE",
        date: {
          gte: previousStartDate,
          lte: previousEndDate,
        },
      },
      select: { category: true, amount: true },
    });

    const previousSpentMap: Record<string, number> = {};
    for (const tx of previousTransactions) {
      const current = previousSpentMap[tx.category] ?? 0;
      previousSpentMap[tx.category] = current + tx.amount;
    }

    const previousTotalSpent = budget.items.reduce(
      (sum: number, item) => sum + findCategorySpent(item.name, previousSpentMap),
      0,
    );

    // Calculate percentage for both periods
    const currentPercentage =
      totalBudgeted > 0 ? Math.min(100, Math.round((currentTotalSpent / totalBudgeted) * 100)) : 0;
    const previousPercentage =
      totalBudgeted > 0 ? Math.min(100, Math.round((previousTotalSpent / totalBudgeted) * 100)) : 0;

    return {
      budgetId: budget.id,
      name: budget.name,
      periodType: budget.type,
      currentPeriod: {
        startDate: budget.startDate,
        endDate: budget.endDate,
        totalBudgeted: totalBudgeted,
        spent: currentTotalSpent,
        percentage: currentPercentage,
        status: calculateBudgetStatus(currentTotalSpent, totalBudgeted).status,
      },
      previousPeriod: {
        startDate: previousStartDate,
        endDate: previousEndDate,
        totalBudgeted: totalBudgeted,
        spent: previousTotalSpent,
        percentage: previousPercentage,
        status: calculateBudgetStatus(previousTotalSpent, totalBudgeted).status,
      },
      comparison: {
        currentSpent: currentTotalSpent,
        previousSpent: previousTotalSpent,
        change: currentTotalSpent - previousTotalSpent,
        changePercent:
          previousTotalSpent > 0
            ? Math.round(((currentTotalSpent - previousTotalSpent) / previousTotalSpent) * 100)
            : previousTotalSpent === 0 && currentTotalSpent > 0
              ? 100
              : 0,
        hasPreviousPeriodData: previousTotalSpent > 0 || true, // Always true for non-empty budgets
      },
    };
  }),
});
