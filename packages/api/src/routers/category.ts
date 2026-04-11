// packages/api/src/routers/category.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";

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

      const [items, total] = await Promise.all([
        ctx.db.category.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: "asc" },
        }),
        ctx.db.category.count({ where }),
      ]);

      return { items, total, page, limit };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        type: CategoryTypeEnum,
        parent: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data: Parameters<typeof ctx.db.category.create>[0]["data"] = {
        userId: ctx.session.user.id,
        name: input.name,
        type: input.type,
        isDefault: false,
      };
      if (input.parent !== undefined) data.parent = input.parent;
      if (input.icon !== undefined) data.icon = input.icon;
      if (input.color !== undefined) data.color = input.color;

      return ctx.db.category.create({ data });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
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
        where: { id: input.id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
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
      if (existing.isDefault) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete default categories",
        });
      }
      await ctx.db.category.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
