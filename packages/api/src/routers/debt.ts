// packages/api/src/routers/debt.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure, objectId } from "../trpc.js";

const DebtTypeEnum = z.enum([
  "CREDIT_CARD",
  "MORTGAGE",
  "STUDENT_LOAN",
  "AUTO_LOAN",
  "PERSONAL_LOAN",
  "OTHER",
]);

export const debtRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        type: DebtTypeEnum.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      const where = {
        userId,
        ...(input.type !== undefined && { type: input.type }),
      };

      const [items, total] = await Promise.all([
        ctx.db.debt.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.debt.count({ where }),
      ]);

      return { items, total, page, limit };
    }),

  getById: protectedProcedure.input(z.object({ id: objectId })).query(async ({ ctx, input }) => {
    const debt = await ctx.db.debt.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
    });
    if (!debt) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Debt not found" });
    }
    return debt;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        type: DebtTypeEnum,
        totalAmount: z.number().positive(),
        remaining: z.number().min(0),
        interestRate: z.number().min(0),
        minPayment: z.number().positive(),
        dueDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data: Parameters<typeof ctx.db.debt.create>[0]["data"] = {
        userId: ctx.session.user.id,
        name: input.name,
        type: input.type,
        totalAmount: input.totalAmount,
        remaining: input.remaining,
        interestRate: input.interestRate,
        minPayment: input.minPayment,
      };
      if (input.dueDate !== undefined) data.dueDate = input.dueDate;

      return ctx.db.debt.create({ data });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: objectId,
        name: z.string().min(1).max(200).optional(),
        type: DebtTypeEnum.optional(),
        totalAmount: z.number().positive().optional(),
        remaining: z.number().min(0).optional(),
        interestRate: z.number().min(0).optional(),
        minPayment: z.number().positive().optional(),
        dueDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.debt.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Debt not found" });
      }

      const data: Parameters<typeof ctx.db.debt.update>[0]["data"] = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.type !== undefined) data.type = input.type;
      if (input.totalAmount !== undefined) data.totalAmount = input.totalAmount;
      if (input.remaining !== undefined) data.remaining = input.remaining;
      if (input.interestRate !== undefined) data.interestRate = input.interestRate;
      if (input.minPayment !== undefined) data.minPayment = input.minPayment;
      if (input.dueDate !== undefined) data.dueDate = input.dueDate;

      return ctx.db.debt.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data,
      });
    }),

  delete: protectedProcedure.input(z.object({ id: objectId })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.debt.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
    });
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Debt not found" });
    }
    await ctx.db.debt.delete({ where: { id: input.id, userId: ctx.session.user.id } });
    return { success: true };
  }),

  getSummary: protectedProcedure.query(async ({ ctx }) => {
    const debts = await ctx.db.debt.findMany({
      where: { userId: ctx.session.user.id },
      select: {
        type: true,
        totalAmount: true,
        remaining: true,
        interestRate: true,
        minPayment: true,
      },
    });

    const totalAmount = debts.reduce((sum, debt) => sum + debt.totalAmount, 0);
    const totalRemaining = debts.reduce((sum, debt) => sum + debt.remaining, 0);
    const totalPaid = totalAmount - totalRemaining;
    const payoffPercent = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;
    const totalMinPayment = debts.reduce((sum, debt) => sum + debt.minPayment, 0);
    const weightedInterestRate =
      totalRemaining > 0
        ? debts.reduce((sum, debt) => sum + debt.interestRate * debt.remaining, 0) / totalRemaining
        : 0;

    const byType: Record<string, { totalAmount: number; remaining: number; minPayment: number }> =
      {};
    for (const debt of debts) {
      const entry = byType[debt.type] ?? { totalAmount: 0, remaining: 0, minPayment: 0 };
      byType[debt.type] = {
        totalAmount: entry.totalAmount + debt.totalAmount,
        remaining: entry.remaining + debt.remaining,
        minPayment: entry.minPayment + debt.minPayment,
      };
    }

    return {
      totalAmount,
      totalRemaining,
      totalPaid,
      payoffPercent,
      totalMinPayment,
      weightedInterestRate,
      byType,
    };
  }),
});
