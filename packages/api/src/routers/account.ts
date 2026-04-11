// packages/api/src/routers/account.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure, objectId } from "../trpc.js";

const AccountTypeEnum = z.enum(["CHECKING", "SAVINGS", "CREDIT", "INVESTMENT", "CASH", "OTHER"]);

export const accountRouter = router({
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
        ctx.db.account.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.account.count({ where: { userId } }),
      ]);

      return { items, total, page, limit };
    }),

  getById: protectedProcedure.input(z.object({ id: objectId })).query(async ({ ctx, input }) => {
    const account = await ctx.db.account.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
    });
    if (!account) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
    }
    return account;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        type: AccountTypeEnum,
        currency: z.string().min(1).max(10).default("IDR"),
        initialBalance: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.account.create({
        data: {
          userId: ctx.session.user.id,
          name: input.name,
          type: input.type,
          currency: input.currency,
          initialBalance: input.initialBalance,
          balance: input.initialBalance,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: objectId,
        name: z.string().min(1).max(100).optional(),
        type: AccountTypeEnum.optional(),
        currency: z.string().min(1).max(10).optional(),
        isActive: z.boolean().optional(),
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
        type?: "CHECKING" | "SAVINGS" | "CREDIT" | "INVESTMENT" | "CASH" | "OTHER";
        currency?: string;
        isActive?: boolean;
      } = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.type !== undefined) data.type = input.type;
      if (input.currency !== undefined) data.currency = input.currency;
      if (input.isActive !== undefined) data.isActive = input.isActive;

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
});
