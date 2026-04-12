// packages/api/src/routers/category.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure, objectId } from "../trpc.js";

const CategoryTypeEnum = z.enum(["INCOME", "EXPENSE"]);

export const categoryRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        type: CategoryTypeEnum.optional(),
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

      const [categories, total] = await Promise.all([
        ctx.db.category.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: "asc" },
        }),
        ctx.db.category.count({ where }),
      ]);

      // Get usage count for each category (number of transactions with this category)
      const transactions = await ctx.db.transaction.findMany({
        where: {
          userId,
          ...(input.type !== undefined && { type: input.type }),
        },
        select: { category: true },
      });

      // Count transactions per category using a Map
      const usageCountMap = new Map<string, number>();
      for (const transaction of transactions) {
        if (transaction.category) {
          usageCountMap.set(
            transaction.category,
            (usageCountMap.get(transaction.category) || 0) + 1,
          );
        }
      }

      // Map usage counts to categories
      const items = categories.map((category) => ({
        ...category,
        usageCount: usageCountMap.get(category.id) || 0,
      }));

      return { items, total, page, limit };
    }),

  getById: protectedProcedure.input(z.object({ id: objectId })).query(async ({ ctx, input }) => {
    const category = await ctx.db.category.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
    });
    if (!category) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
    }
    return category;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        type: CategoryTypeEnum,
        parent: z.string().max(100).optional(),
        icon: z.string().max(50).optional(),
        color: z.string().max(20).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data: Parameters<typeof ctx.db.category.create>[0]["data"] = {
        userId: ctx.session.user.id,
        name: input.name,
        type: input.type,
        isDefault: false,
        usageCount: 0,
      };
      if (input.parent !== undefined) data.parent = input.parent;
      if (input.icon !== undefined) data.icon = input.icon;
      if (input.color !== undefined) data.color = input.color;

      return ctx.db.category.create({ data });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: objectId,
        name: z.string().min(1).max(100).optional(),
        icon: z.string().max(50).optional(),
        color: z.string().max(20).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.category.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      const data: { name?: string; icon?: string; color?: string } = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.icon !== undefined) data.icon = input.icon;
      if (input.color !== undefined) data.color = input.color;

      return ctx.db.category.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data,
      });
    }),

  delete: protectedProcedure.input(z.object({ id: objectId })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.category.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
    });
    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Category not found",
      });
    }
    if (existing.isDefault) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot delete default categories",
      });
    }
    await ctx.db.category.delete({ where: { id: input.id, userId: ctx.session.user.id } });
    return { success: true };
  }),
});
