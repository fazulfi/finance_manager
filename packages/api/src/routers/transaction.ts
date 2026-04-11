// packages/api/src/routers/transaction.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";

const TransactionTypeEnum = z.enum(["INCOME", "EXPENSE", "TRANSFER"]);

export const transactionRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        accountId: z.string().optional(),
        type: TransactionTypeEnum.optional(),
        category: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      const where = {
        userId,
        ...(input.accountId !== undefined && { accountId: input.accountId }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.category !== undefined && { category: input.category }),
        ...((input.dateFrom !== undefined || input.dateTo !== undefined) && {
          date: {
            ...(input.dateFrom !== undefined && { gte: input.dateFrom }),
            ...(input.dateTo !== undefined && { lte: input.dateTo }),
          },
        }),
        ...(input.search !== undefined && {
          OR: [
            {
              description: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
            {
              category: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }),
      };

      const [items, total] = await Promise.all([
        ctx.db.transaction.findMany({
          where,
          skip,
          take: limit,
          orderBy: { date: "desc" },
        }),
        ctx.db.transaction.count({ where }),
      ]);

      return { items, total, page, limit };
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const transaction = await ctx.db.transaction.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
    });
    if (!transaction) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Transaction not found",
      });
    }
    return transaction;
  }),

  create: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        date: z.date(),
        amount: z.number().positive(),
        currency: z.string().min(1).max(10).default("IDR"),
        type: TransactionTypeEnum,
        category: z.string().min(1),
        subcategory: z.string().optional(),
        project: z.string().optional(),
        tags: z.array(z.string()).default([]),
        description: z.string().optional(),
        transferTo: z.string().optional(),
        isRecurring: z.boolean().default(false),
        recurringRule: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify account ownership before creating transaction
      const account = await ctx.db.account.findFirst({
        where: { id: input.accountId, userId: ctx.session.user.id },
      });
      if (!account) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Account not found or access denied",
        });
      }

      const data: Parameters<typeof ctx.db.transaction.create>[0]["data"] = {
        userId: ctx.session.user.id,
        accountId: input.accountId,
        date: input.date,
        amount: input.amount,
        currency: input.currency,
        type: input.type,
        category: input.category,
        tags: input.tags,
        isRecurring: input.isRecurring,
      };
      if (input.subcategory !== undefined) data.subcategory = input.subcategory;
      if (input.project !== undefined) data.project = input.project;
      if (input.description !== undefined) data.description = input.description;
      if (input.transferTo !== undefined) data.transferTo = input.transferTo;
      if (input.recurringRule !== undefined) data.recurringRule = input.recurringRule;

      return ctx.db.transaction.create({ data });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        date: z.date().optional(),
        amount: z.number().positive().optional(),
        currency: z.string().min(1).max(10).optional(),
        type: TransactionTypeEnum.optional(),
        category: z.string().min(1).optional(),
        subcategory: z.string().optional(),
        project: z.string().optional(),
        tags: z.array(z.string()).optional(),
        description: z.string().optional(),
        transferTo: z.string().optional(),
        isRecurring: z.boolean().optional(),
        recurringRule: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.transaction.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transaction not found",
        });
      }

      const data: Parameters<typeof ctx.db.transaction.update>[0]["data"] = {};
      if (input.date !== undefined) data.date = input.date;
      if (input.amount !== undefined) data.amount = input.amount;
      if (input.currency !== undefined) data.currency = input.currency;
      if (input.type !== undefined) data.type = input.type;
      if (input.category !== undefined) data.category = input.category;
      if (input.subcategory !== undefined) data.subcategory = input.subcategory;
      if (input.project !== undefined) data.project = input.project;
      if (input.tags !== undefined) data.tags = input.tags;
      if (input.description !== undefined) data.description = input.description;
      if (input.transferTo !== undefined) data.transferTo = input.transferTo;
      if (input.isRecurring !== undefined) data.isRecurring = input.isRecurring;
      if (input.recurringRule !== undefined) data.recurringRule = input.recurringRule;

      return ctx.db.transaction.update({
        where: { id: input.id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.transaction.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transaction not found",
        });
      }
      await ctx.db.transaction.delete({ where: { id: input.id } });
      return { success: true };
    }),

  getStats: protectedProcedure
    .input(
      z.object({
        dateFrom: z.date(),
        dateTo: z.date(),
        accountId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const baseWhere = {
        userId,
        date: { gte: input.dateFrom, lte: input.dateTo },
        ...(input.accountId !== undefined && { accountId: input.accountId }),
      };

      // MongoDB does not support groupBy — use two separate aggregate calls
      const [incomeResult, expenseResult] = await Promise.all([
        ctx.db.transaction.aggregate({
          where: { ...baseWhere, type: "INCOME" },
          _sum: { amount: true },
        }),
        ctx.db.transaction.aggregate({
          where: { ...baseWhere, type: "EXPENSE" },
          _sum: { amount: true },
        }),
      ]);

      const totalIncome = incomeResult._sum.amount ?? 0;
      const totalExpense = expenseResult._sum.amount ?? 0;
      const netCashFlow = totalIncome - totalExpense;

      return { totalIncome, totalExpense, netCashFlow };
    }),
});
