// packages/api/src/routers/budget.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";

const BudgetTypeEnum = z.enum(["MONTHLY", "ANNUAL", "CUSTOM"]);
const BudgetPeriodEnum = z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]);

const BudgetItemSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(1),
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

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
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
        items: z.array(BudgetItemSchema).default([]),
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
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        type: BudgetTypeEnum.optional(),
        period: BudgetPeriodEnum.optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        items: z.array(BudgetItemSchema).optional(),
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
        data.items = input.items.map((item) => ({
          categoryId: item.categoryId,
          name: item.name,
          budgeted: item.budgeted,
          spent: 0,
        }));
      }

      return ctx.db.budget.update({ where: { id: input.id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.budget.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
      }
      await ctx.db.budget.delete({ where: { id: input.id } });
      return { success: true };
    }),

  getProgress: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const budget = await ctx.db.budget.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!budget) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
      }

      // Fetch all EXPENSE transactions in the budget period.
      // IMPORTANT: MongoDB does NOT support Prisma groupBy — use findMany + in-memory aggregation.
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

      // Enrich each budget item with actual spent amount
      const itemsWithProgress = budget.items.map((item) => {
        const spent = spentMap[item.name] ?? 0;
        return {
          ...item,
          actualSpent: spent,
          remaining: item.budgeted - spent,
          percentUsed: item.budgeted > 0 ? Math.round((spent / item.budgeted) * 100) : 0,
        };
      });

      const totalBudgeted = budget.items.reduce((sum, item) => sum + item.budgeted, 0);
      const totalSpent = itemsWithProgress.reduce((sum, item) => sum + item.actualSpent, 0);

      return {
        ...budget,
        items: itemsWithProgress,
        totalBudgeted,
        totalSpent,
        totalRemaining: totalBudgeted - totalSpent,
      };
    }),
});
