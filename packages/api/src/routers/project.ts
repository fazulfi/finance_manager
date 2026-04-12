// packages/api/src/routers/project.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure, objectId } from "../trpc.js";
import type { DbClient } from "../trpc.js";

const ProjectStatusEnum = z.enum(["ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"]);
const MS_PER_DAY = 1000 * 60 * 60 * 24;

async function getProjectAnalytics(
  db: DbClient,
  userId: string,
  project: {
    id: string;
    budget: number | null;
    startDate: Date | null;
    targetDate: Date | null;
  },
) {
  const [spentAggregate, firstExpense] = await Promise.all([
    db.transaction.aggregate({
      where: {
        userId,
        project: project.id,
        type: "EXPENSE",
      },
      _sum: { amount: true },
    }),
    db.transaction.findFirst({
      where: {
        userId,
        project: project.id,
        type: "EXPENSE",
      },
      select: { date: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const now = new Date();
  const spent = spentAggregate._sum.amount ?? 0;
  const budget = project.budget ?? 0;
  const remaining = budget - spent;
  const overspent = Math.max(spent - budget, 0);
  const progressPercent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

  const burnRateStartDate = project.startDate ?? firstExpense?.date ?? now;
  const elapsedDays = Math.max(
    1,
    Math.ceil((now.getTime() - burnRateStartDate.getTime()) / MS_PER_DAY),
  );
  const burnRatePerDay = spent > 0 ? spent / elapsedDays : 0;

  const estimatedCompletionDate =
    budget > 0 && burnRatePerDay > 0 && remaining > 0
      ? new Date(now.getTime() + (remaining / burnRatePerDay) * MS_PER_DAY)
      : remaining <= 0
        ? now
        : null;

  const timelineDaysRemaining =
    project.targetDate !== null
      ? Math.ceil((project.targetDate.getTime() - now.getTime()) / MS_PER_DAY)
      : null;

  const isCompleted = budget > 0 ? spent >= budget : false;
  const isOverdue = project.targetDate !== null ? now > project.targetDate && !isCompleted : false;
  const isAtRisk =
    !isCompleted &&
    project.targetDate !== null &&
    estimatedCompletionDate !== null &&
    estimatedCompletionDate > project.targetDate;

  return {
    spent,
    budget,
    remaining,
    overspent,
    progressPercent,
    burnRatePerDay,
    estimatedCompletionDate,
    timelineDaysRemaining,
    isCompleted,
    isOverdue,
    isAtRisk,
  };
}

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
    await ctx.db.transaction.updateMany({
      where: { userId: ctx.session.user.id, project: input.id },
      data: { project: null },
    });

    await ctx.db.project.delete({ where: { id: input.id, userId: ctx.session.user.id } });
    return { success: true };
  }),

  getAnalytics: protectedProcedure
    .input(z.object({ id: objectId }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        select: { id: true, budget: true, startDate: true, targetDate: true },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      return getProjectAnalytics(ctx.db, ctx.session.user.id, project);
    }),

  updateProgress: protectedProcedure
    .input(z.object({ id: objectId }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.project.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        select: { id: true, budget: true, startDate: true, targetDate: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const analytics = await getProjectAnalytics(ctx.db, ctx.session.user.id, existing);

      return ctx.db.project.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { spent: analytics.spent },
      });
    }),
});
