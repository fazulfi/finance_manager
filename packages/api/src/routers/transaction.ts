// packages/api/src/routers/transaction.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure, objectId } from "../trpc.js";

const TransactionTypeEnum = z.enum(["INCOME", "EXPENSE", "TRANSFER"]);
const CurrencyEnum = z.enum(["IDR", "USD", "EUR", "SGD", "JPY", "CNY", "AUD", "CAD"]);

export const transactionRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        accountId: objectId.optional(),
        type: TransactionTypeEnum.optional(),
        category: objectId.optional(),
        project: objectId.optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        amountMin: z.number().positive().optional(),
        amountMax: z.number().positive().optional(),
        search: z.string().max(500).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = { userId };

      if (input.accountId !== undefined) {
        where.accountId = input.accountId;
      }
      if (input.type !== undefined) {
        where.type = input.type;
      }
      if (input.category !== undefined) {
        where.category = input.category;
      }
      if (input.project !== undefined) {
        where.project = input.project;
      }
      if (input.dateFrom || input.dateTo) {
        (where as { date?: { gte?: Date; lte?: Date } }).date = {};
        if (input.dateFrom)
          (where as { date?: { gte?: Date; lte?: Date } }).date!.gte = input.dateFrom;
        if (input.dateTo) (where as { date?: { gte?: Date; lte?: Date } }).date!.lte = input.dateTo;
      }
      if (input.amountMin || input.amountMax) {
        (where as { amount?: { gte?: number; lte?: number } }).amount = {};
        if (input.amountMin)
          (where as { amount?: { gte?: number; lte?: number } }).amount!.gte = input.amountMin;
        if (input.amountMax)
          (where as { amount?: { gte?: number; lte?: number } }).amount!.lte = input.amountMax;
      }
      if (input.search) {
        where.OR = [
          { category: { contains: input.search, mode: "insensitive" as const } },
          { description: { contains: input.search, mode: "insensitive" as const } },
        ];
      }

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

  getById: protectedProcedure.input(z.object({ id: objectId })).query(async ({ ctx, input }) => {
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
        accountId: objectId,
        date: z.date(),
        amount: z.number().positive(),
        currency: z.string().min(1).max(10).default("IDR"),
        type: TransactionTypeEnum,
        category: z.string().min(1).max(500),
        subcategory: z.string().max(500).optional(),
        project: objectId.nullable().optional(),
        tags: z.array(z.string().max(100)).default([]),
        description: z.string().max(500).optional(),
        transferTo: objectId.optional(),
        isRecurring: z.boolean().default(false),
        recurringRule: z.string().max(500).optional(),
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

      // Verify transferTo account ownership and active status for TRANSFER transactions
      if (input.type === "TRANSFER" && input.transferTo !== undefined) {
        const transferAccount = await ctx.db.account.findFirst({
          where: { id: input.transferTo, userId: ctx.session.user.id, isActive: true },
          select: { isActive: true, currency: true },
        });

        if (!transferAccount || !transferAccount.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Transfer destination account must be active and belong to you",
          });
        }

        if (transferAccount.currency !== account.currency) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Source and destination accounts must have the same currency",
          });
        }
      }

      // Verify account exists, belongs to user, and is active
      const activeAccount = await ctx.db.account.findFirst({
        where: { id: input.accountId, userId: ctx.session.user.id, isActive: true },
        select: { balance: true, currency: true },
      });

      if (!activeAccount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Account not found or access denied",
        });
      }

      if (input.project !== undefined && input.project !== null) {
        const project = await ctx.db.project.findFirst({
          where: { id: input.project, userId: ctx.session.user.id },
          select: { id: true },
        });

        if (!project) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Project not found or access denied",
          });
        }
      }

      // Validate balance for INCOME/EXPENSE transactions
      if (input.type !== "INCOME" && activeAccount.balance < input.amount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient funds",
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
        subcategory: input.subcategory ?? null,
        project: input.project ?? null,
        description: input.description ?? null,
        transferTo: input.transferTo ?? null,
        recurringRule: input.recurringRule ?? null,
      } as Parameters<typeof ctx.db.transaction.create>[0]["data"];

      return ctx.db.transaction.create({ data });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: objectId,
        date: z.date().optional(),
        amount: z.number().positive().optional(),
        currency: z.string().min(1).max(10).optional(),
        type: TransactionTypeEnum.optional(),
        category: z.string().min(1).max(500).optional(),
        subcategory: z.string().max(500).optional(),
        project: objectId.nullable().optional(),
        tags: z.array(z.string().max(100)).optional(),
        description: z.string().max(500).optional(),
        transferTo: objectId.optional(),
        isRecurring: z.boolean().optional(),
        recurringRule: z.string().max(500).optional(),
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

      // Get source account for balance validation
      const sourceAccount = await ctx.db.account.findFirst({
        where: { id: existing.accountId, userId: ctx.session.user.id, isActive: true },
        select: { balance: true, currency: true },
      });

      if (!sourceAccount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Source account not found",
        });
      }

      // Verify transferTo account ownership and active status for TRANSFER transactions
      const effectiveType = input.type ?? existing.type;
      if (effectiveType === "TRANSFER" && input.transferTo !== undefined) {
        const transferAccount = await ctx.db.account.findFirst({
          where: { id: input.transferTo, userId: ctx.session.user.id, isActive: true },
          select: { isActive: true, currency: true },
        });

        if (!transferAccount || !transferAccount.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Transfer destination account must be active and belong to you",
          });
        }

        if (transferAccount.currency !== sourceAccount.currency) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Source and destination accounts must have the same currency",
          });
        }
      }

      const delta = (type: "INCOME" | "EXPENSE" | "TRANSFER", amount: number) =>
        type === "INCOME" ? amount : -amount;
      const updatedAmount = input.amount ?? existing.amount;
      const expectedBalance =
        sourceAccount.balance -
        delta(existing.type, existing.amount) +
        delta(effectiveType, updatedAmount);

      // Validate balance after changes
      if (expectedBalance < 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient funds",
        });
      }

      if (input.project !== undefined && input.project !== null) {
        const project = await ctx.db.project.findFirst({
          where: { id: input.project, userId: ctx.session.user.id },
          select: { id: true },
        });

        if (!project) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Project not found or access denied",
          });
        }
      }

      const data: Partial<Parameters<typeof ctx.db.transaction.update>[0]["data"]> = {};
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
      // Include accountId to ensure transaction remains linked to source account
      data.accountId = existing.accountId;

      return ctx.db.transaction.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data,
      });
    }),

  delete: protectedProcedure.input(z.object({ id: objectId })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.transaction.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
    });
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Transaction not found",
      });
    }
    // Soft delete — don't restore balances (by design)
    await ctx.db.transaction.update({
      where: { id: input.id, userId: ctx.session.user.id },
      data: { isRecurring: false } as Parameters<typeof ctx.db.transaction.update>[0]["data"], // Stop recurring transactions on delete
    });
    return { success: true };
  }),

  getStats: protectedProcedure
    .input(
      z.object({
        dateFrom: z.date(),
        dateTo: z.date(),
        accountId: objectId.optional(),
        project: objectId.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const baseWhere = {
        userId,
        date: { gte: input.dateFrom, lte: input.dateTo },
        ...(input.accountId !== undefined && { accountId: input.accountId }),
        ...(input.project !== undefined && { project: input.project }),
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

  bulkCreate: protectedProcedure
    .input(
      z
        .array(
          z.object({
            accountId: objectId,
            date: z.date(),
            amount: z.number().positive(),
            currency: CurrencyEnum.optional().default("IDR"),
            type: TransactionTypeEnum,
            category: z.string().min(1).max(100),
            subcategory: z.string().max(100).optional(),
            project: objectId.nullable().optional(),
            tags: z.array(z.string()).max(50).optional().default([]),
            description: z.string().max(500).optional(),
            transferTo: objectId.optional(),
            isRecurring: z.boolean().default(false),
            recurringRule: z.string().max(200).optional(),
          }),
        )
        .max(100, { message: "Maximum 100 transactions per request" }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const projectIds = Array.from(
        new Set(
          input
            .map((item) => item.project)
            .filter(
              (projectId): projectId is string => projectId !== undefined && projectId !== null,
            ),
        ),
      );

      if (projectIds.length > 0) {
        const ownedProjects = await ctx.db.project.findMany({
          where: {
            userId,
            id: { in: projectIds },
          },
          select: { id: true },
        });

        if (ownedProjects.length !== projectIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "One or more projects not found or access denied",
          });
        }
      }

      // Preload all referenced accounts (source + transfer destination)
      const referencedAccountIds = Array.from(
        new Set(
          input.flatMap((item) =>
            item.transferTo !== undefined ? [item.accountId, item.transferTo] : [item.accountId],
          ),
        ),
      );
      const referencedAccounts = await ctx.db.account.findMany({
        where: {
          id: { in: referencedAccountIds },
          userId,
          isActive: true,
        },
        select: {
          id: true,
          balance: true,
          currency: true,
        },
      });
      const accountMap = new Map(referencedAccounts.map((account) => [account.id, account]));

      const transactions: any[] = [];

      for (const item of input) {
        const account = accountMap.get(item.accountId);

        if (!account) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Account ${item.accountId} not found`,
          });
        }

        // Build transaction data
        const transactionData: Parameters<typeof ctx.db.transaction.create>[0]["data"] = {
          userId,
          accountId: item.accountId,
          date: item.date,
          amount: item.amount,
          currency: item.currency,
          type: item.type,
          category: item.category,
          subcategory: item.subcategory ?? null,
          project: item.project ?? null,
          tags: item.tags,
          description: item.description ?? null,
          transferTo: item.transferTo ?? null,
          isRecurring: item.isRecurring,
          recurringRule: item.recurringRule ?? null,
        } as Parameters<typeof ctx.db.transaction.create>[0]["data"];

        // Add transfer data if needed
        if (item.type === "TRANSFER") {
          if (!item.transferTo) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Transfer destination account is required",
            });
          }

          const targetAccount = accountMap.get(item.transferTo);
          if (!targetAccount) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Transfer destination account not found`,
            });
          }
          if (account.currency !== targetAccount.currency) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Cannot transfer between different currencies",
            });
          }
          if (account.balance < item.amount) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient funds" });
          }
        }

        transactions.push(transactionData);
      }

      // Accumulate total adjustments per account BEFORE transaction
      const totalAdjustments = new Map<string, number>();

      for (const item of input) {
        const adjustments = totalAdjustments.get(item.accountId) || 0;
        if (item.type === "INCOME") {
          totalAdjustments.set(item.accountId, adjustments + item.amount);
        } else if (item.type === "EXPENSE" || item.type === "TRANSFER") {
          totalAdjustments.set(item.accountId, adjustments - item.amount);
        }
      }

      // Check total sufficiency for all accounts
      for (const [accountId, adjustment] of totalAdjustments) {
        if (adjustment < 0) {
          const account = accountMap.get(accountId);
          if (account && account.balance < -adjustment) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Insufficient funds for bulk transaction",
            });
          }
        }
      }

      return ctx.db.$transaction(async (db) => {
        // Process balance updates
        for (const item of input) {
          const account = accountMap.get(item.accountId);
          if (!account) continue;

          let balanceAdjustment = 0;
          if (item.type === "INCOME") {
            balanceAdjustment = item.amount;
          } else if (item.type === "EXPENSE") {
            balanceAdjustment = -item.amount;
          } else if (item.type === "TRANSFER") {
            balanceAdjustment = -item.amount;
          }

          await db.account.updateMany({
            where: {
              id: item.accountId,
              userId,
              isActive: true,
            },
            data: {
              balance: { increment: balanceAdjustment },
            },
          });

          // Increment target account balance for TRANSFER transactions
          if (item.type === "TRANSFER" && item.transferTo) {
            await db.account.updateMany({
              where: {
                id: item.transferTo,
                userId,
                isActive: true,
              },
              data: {
                balance: { increment: item.amount },
              },
            });
          }
        }

        // Create transactions
        const created = await db.transaction.createMany({
          data: transactions,
        });

        return { count: created.count };
      });
    }),

  bulkDelete: protectedProcedure
    .input(z.array(objectId).max(100, { message: "Maximum 100 transactions per request" }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const where = {
        id: { in: input },
        userId,
      };

      const result = await ctx.db.transaction.updateMany({
        where,
        data: { isRecurring: false },
      });

      return { count: result.count };
    }),
});
