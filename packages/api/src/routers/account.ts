// packages/api/src/routers/account.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure, objectId } from "../trpc.js";

const AccountTypeEnum = z.enum(["CHECKING", "SAVINGS", "CREDIT", "INVESTMENT", "CASH", "OTHER"]);
const CurrencyEnum = z.enum(["IDR", "USD", "EUR", "SGD", "JPY"]);

export const accountRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        type: AccountTypeEnum.optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      const where = {
        userId,
        ...(input.type !== undefined && { type: input.type }),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : { isActive: true }),
      };

      const [items, total] = await Promise.all([
        ctx.db.account.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.account.count({ where }),
      ]);

      return { items, total, page, limit };
    }),

  getById: protectedProcedure
    .input(
      z.object({
        id: objectId,
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const account = await ctx.db.account.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
      }

      const skip = (input.page - 1) * input.limit;
      const transactionWhere = {
        userId: ctx.session.user.id,
        OR: [{ accountId: input.id }, { transferTo: input.id }],
      };

      const [transactions, total] = await Promise.all([
        ctx.db.transaction.findMany({
          where: transactionWhere,
          skip,
          take: input.limit,
          orderBy: { date: "desc" },
        }),
        ctx.db.transaction.count({ where: transactionWhere }),
      ]);

      return {
        account,
        transactions: {
          items: transactions,
          total,
          page: input.page,
          limit: input.limit,
        },
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        type: AccountTypeEnum,
        currency: CurrencyEnum.default("IDR"),
        initialBalance: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data: Parameters<typeof ctx.db.account.create>[0]["data"] = {
        userId: ctx.session.user.id,
        name: input.name,
        type: input.type,
        currency: input.currency,
        initialBalance: input.initialBalance,
        balance: input.initialBalance,
      };
      if (input.description !== undefined) data.description = input.description;

      return ctx.db.account.create({
        data,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: objectId,
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        type: AccountTypeEnum.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.account.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
      }

      const data: {
        name?: string;
        description?: string;
        type?: "CHECKING" | "SAVINGS" | "CREDIT" | "INVESTMENT" | "CASH" | "OTHER";
      } = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.description !== undefined) data.description = input.description;
      if (input.type !== undefined) data.type = input.type;

      return ctx.db.account.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data,
      });
    }),

  delete: protectedProcedure.input(z.object({ id: objectId })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.account.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
    });
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
    }
    // Soft delete — mark as inactive rather than hard delete
    return ctx.db.account.update({
      where: { id: input.id, userId: ctx.session.user.id },
      data: { isActive: false },
    });
  }),

  transfer: protectedProcedure
    .input(
      z
        .object({
          fromAccountId: objectId,
          toAccountId: objectId,
          amount: z.number().positive(),
          description: z.string().max(500).optional(),
          date: z.date().optional(),
        })
        .refine((data) => data.fromAccountId !== data.toAccountId, {
          message: "Cannot transfer to the same account",
          path: ["toAccountId"],
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      return ctx.db.$transaction(async (db) => {
        const [fromAccount, toAccount] = await Promise.all([
          db.account.findFirst({
            where: {
              id: input.fromAccountId,
              userId,
              isActive: true,
            },
            select: {
              id: true,
              name: true,
              balance: true,
              currency: true,
            },
          }),
          db.account.findFirst({
            where: {
              id: input.toAccountId,
              userId,
              isActive: true,
            },
            select: {
              id: true,
              name: true,
              balance: true,
              currency: true,
            },
          }),
        ]);

        if (!fromAccount || !toAccount) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
        }

        if (fromAccount.currency !== toAccount.currency) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot transfer across different account currencies",
          });
        }

        if (fromAccount.balance < input.amount) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient funds" });
        }

        const debited = await db.account.updateMany({
          where: {
            id: input.fromAccountId,
            userId,
            isActive: true,
            balance: { gte: input.amount },
          },
          data: {
            balance: { decrement: input.amount },
          },
        });

        if (debited.count !== 1) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient funds" });
        }

        const credited = await db.account.updateMany({
          where: {
            id: input.toAccountId,
            userId,
            isActive: true,
            currency: fromAccount.currency,
          },
          data: {
            balance: { increment: input.amount },
          },
        });

        if (credited.count !== 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Destination account is not eligible",
          });
        }

        const transactionData: Parameters<typeof db.transaction.create>[0]["data"] = {
          userId,
          accountId: input.fromAccountId,
          date: input.date ?? new Date(),
          amount: input.amount,
          currency: fromAccount.currency,
          type: "TRANSFER",
          category: "Transfer",
          transferTo: input.toAccountId,
          tags: [],
          isRecurring: false,
        };
        if (input.description !== undefined) transactionData.description = input.description;

        const transaction = await db.transaction.create({ data: transactionData });

        const [updatedFrom, updatedTo] = await Promise.all([
          db.account.findFirst({
            where: { id: input.fromAccountId, userId },
            select: { balance: true },
          }),
          db.account.findFirst({
            where: { id: input.toAccountId, userId },
            select: { balance: true },
          }),
        ]);

        return {
          success: true,
          transaction,
          fromAccount: {
            id: fromAccount.id,
            name: fromAccount.name,
            balance: updatedFrom?.balance ?? fromAccount.balance - input.amount,
          },
          toAccount: {
            id: toAccount.id,
            name: toAccount.name,
            balance: updatedTo?.balance ?? toAccount.balance + input.amount,
          },
        };
      });
    }),
});
