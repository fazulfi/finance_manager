// packages/api/src/routers/project.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure, objectId } from "../trpc.js";

const ProjectStatusEnum = z.enum(["ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"]);

export const projectRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        status: ProjectStatusEnum.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      const where = {
        userId,
        ...(input.status !== undefined && { status: input.status }),
      };

      const [items, total] = await Promise.all([
        ctx.db.project.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.project.count({ where }),
      ]);

      return { items, total, page, limit };
    }),

  getById: protectedProcedure.input(z.object({ id: objectId })).query(async ({ ctx, input }) => {
    const project = await ctx.db.project.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
    });
    if (!project) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    }
    return project;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        budget: z.number().positive().optional(),
        startDate: z.date().optional(),
        targetDate: z.date().optional(),
        color: z.string().max(20).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data: Parameters<typeof ctx.db.project.create>[0]["data"] = {
        userId: ctx.session.user.id,
        name: input.name,
        status: "ACTIVE",
        spent: 0,
      };
      if (input.description !== undefined) data.description = input.description;
      if (input.budget !== undefined) data.budget = input.budget;
      if (input.startDate !== undefined) data.startDate = input.startDate;
      if (input.targetDate !== undefined) data.targetDate = input.targetDate;
      if (input.color !== undefined) data.color = input.color;

      return ctx.db.project.create({ data });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: objectId,
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        budget: z.number().positive().optional(),
        startDate: z.date().optional(),
        targetDate: z.date().optional(),
        status: ProjectStatusEnum.optional(),
        color: z.string().max(20).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.project.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const data: Parameters<typeof ctx.db.project.update>[0]["data"] = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.description !== undefined) data.description = input.description;
      if (input.budget !== undefined) data.budget = input.budget;
      if (input.startDate !== undefined) data.startDate = input.startDate;
      if (input.targetDate !== undefined) data.targetDate = input.targetDate;
      if (input.status !== undefined) data.status = input.status;
      if (input.color !== undefined) data.color = input.color;

      return ctx.db.project.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data,
      });
    }),

  delete: protectedProcedure.input(z.object({ id: objectId })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.project.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
    });
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    }
    await ctx.db.project.delete({ where: { id: input.id, userId: ctx.session.user.id } });
    return { success: true };
  }),

  updateProgress: protectedProcedure
    .input(
      z.object({
        id: objectId,
        spent: z.number().min(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.project.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      return ctx.db.project.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { spent: input.spent },
      });
    }),
});
