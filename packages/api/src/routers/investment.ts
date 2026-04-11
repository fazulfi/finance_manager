// packages/api/src/routers/investment.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";

const InvestmentTypeEnum = z.enum([
  "STOCK",
  "BOND",
  "CRYPTO",
  "REAL_ESTATE",
  "MUTUAL_FUND",
  "OTHER",
]);

export const investmentRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        type: InvestmentTypeEnum.optional(),
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
        ctx.db.investment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.investment.count({ where }),
      ]);

      return { items, total, page, limit };
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const investment = await ctx.db.investment.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
    });
    if (!investment) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Investment not found" });
    }
    return investment;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        type: InvestmentTypeEnum,
        amount: z.number().positive(),
        currentValue: z.number().min(0),
        cost: z.number().min(0),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const gain = input.currentValue - input.cost;

      const data: Parameters<typeof ctx.db.investment.create>[0]["data"] = {
        userId: ctx.session.user.id,
        name: input.name,
        type: input.type,
        amount: input.amount,
        currentValue: input.currentValue,
        cost: input.cost,
        gain,
      };
      if (input.notes !== undefined) data.notes = input.notes;

      return ctx.db.investment.create({ data });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        type: InvestmentTypeEnum.optional(),
        amount: z.number().positive().optional(),
        currentValue: z.number().min(0).optional(),
        cost: z.number().min(0).optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.investment.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Investment not found" });
      }

      // Recalculate gain if currentValue or cost changes
      const newCurrentValue = input.currentValue ?? existing.currentValue;
      const newCost = input.cost ?? existing.cost;
      const gain = newCurrentValue - newCost;

      const data: Parameters<typeof ctx.db.investment.update>[0]["data"] = {
        gain,
      };
      if (input.name !== undefined) data.name = input.name;
      if (input.type !== undefined) data.type = input.type;
      if (input.amount !== undefined) data.amount = input.amount;
      if (input.currentValue !== undefined) data.currentValue = input.currentValue;
      if (input.cost !== undefined) data.cost = input.cost;
      if (input.notes !== undefined) data.notes = input.notes;

      return ctx.db.investment.update({ where: { id: input.id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.investment.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Investment not found" });
      }
      await ctx.db.investment.delete({ where: { id: input.id } });
      return { success: true };
    }),

  getSummary: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // MongoDB does not support groupBy — use findMany + in-memory aggregation
    const investments = await ctx.db.investment.findMany({
      where: { userId },
      select: { type: true, cost: true, currentValue: true, gain: true },
    });

    const totalCost = investments.reduce((sum, inv) => sum + inv.cost, 0);
    const totalCurrentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    const totalGain = totalCurrentValue - totalCost;
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

    // Group by type for breakdown
    const byType: Record<string, { cost: number; currentValue: number; gain: number }> = {};
    for (const inv of investments) {
      const entry = byType[inv.type] ?? { cost: 0, currentValue: 0, gain: 0 };
      byType[inv.type] = {
        cost: entry.cost + inv.cost,
        currentValue: entry.currentValue + inv.currentValue,
        gain: entry.gain + inv.gain,
      };
    }

    return {
      totalCost,
      totalCurrentValue,
      totalGain,
      totalGainPercent,
      byType,
    };
  }),
});
