// packages/api/src/routers/stock.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";

const ExchangeEnum = z.enum(["NYSE", "NASDAQ", "LSE", "OTHER"]);

export const stockRouter = router({
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
        ctx.db.stock.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { ticker: "asc" },
        }),
        ctx.db.stock.count({ where: { userId } }),
      ]);

      return { items, total, page, limit };
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const stock = await ctx.db.stock.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
    });
    if (!stock) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Stock not found" });
    }
    return stock;
  }),

  create: protectedProcedure
    .input(
      z.object({
        ticker: z.string().min(1).max(20).toUpperCase(),
        name: z.string().min(1),
        exchange: ExchangeEnum.default("OTHER"),
        quantity: z.number().positive(),
        avgBuyPrice: z.number().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const totalCost = input.quantity * input.avgBuyPrice;
      return ctx.db.stock.create({
        data: {
          userId: ctx.session.user.id,
          ticker: input.ticker,
          name: input.name,
          exchange: input.exchange,
          quantity: input.quantity,
          avgBuyPrice: input.avgBuyPrice,
          currentPrice: input.avgBuyPrice,
          totalCost,
          currentValue: totalCost,
          gain: 0,
          gainPercent: 0,
          lastUpdated: new Date(),
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        currentPrice: z.number().positive().optional(),
        quantity: z.number().positive().optional(),
        avgBuyPrice: z.number().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.stock.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Stock not found" });
      }

      const newQuantity = input.quantity ?? existing.quantity;
      const newAvgBuyPrice = input.avgBuyPrice ?? existing.avgBuyPrice;
      const newCurrentPrice = input.currentPrice ?? existing.currentPrice;

      const totalCost = newQuantity * newAvgBuyPrice;
      const currentValue = newQuantity * newCurrentPrice;
      const gain = currentValue - totalCost;
      const gainPercent = totalCost > 0 ? (gain / totalCost) * 100 : 0;

      return ctx.db.stock.update({
        where: { id: input.id },
        data: {
          quantity: newQuantity,
          avgBuyPrice: newAvgBuyPrice,
          currentPrice: newCurrentPrice,
          totalCost,
          currentValue,
          gain,
          gainPercent,
          lastUpdated: new Date(),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.stock.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Stock not found" });
      }
      await ctx.db.stock.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
