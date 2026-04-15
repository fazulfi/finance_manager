// packages/api/src/routers/goal.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { router, protectedProcedure, objectId } from "../trpc.js";

const GoalStatusEnum = z.enum(["ACTIVE", "COMPLETED", "PAUSED"]);

export const goalRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        status: GoalStatusEnum.optional(),
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
        ctx.db.savingsGoal.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.savingsGoal.count({ where }),
      ]);

      return { items, total, page, limit };
    }),

  getById: protectedProcedure.input(z.object({ id: objectId })).query(async ({ ctx, input }) => {
    const goal = await ctx.db.savingsGoal.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
    });
    if (!goal) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Savings goal not found" });
    }
    return goal;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        targetAmount: z.number().positive(),
        currentAmount: z.number().min(0).default(0),
        deadline: z.date().optional(),
        accountId: objectId.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify account ownership if provided
      if (input.accountId !== undefined) {
        const account = await ctx.db.account.findFirst({
          where: { id: input.accountId, userId: ctx.session.user.id },
        });
        if (!account) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Account not found or access denied",
          });
        }
      }

      const data: Parameters<typeof ctx.db.savingsGoal.create>[0]["data"] = {
        userId: ctx.session.user.id,
        name: input.name,
        targetAmount: input.targetAmount,
        currentAmount: input.currentAmount,
        status: "ACTIVE",
      };
      if (input.deadline !== undefined) data.deadline = input.deadline;
      if (input.accountId !== undefined) data.accountId = input.accountId;

      return ctx.db.savingsGoal.create({ data });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: objectId,
        name: z.string().min(1).max(200).optional(),
        targetAmount: z.number().positive().optional(),
        deadline: z.date().optional(),
        accountId: objectId.optional(),
        status: GoalStatusEnum.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.savingsGoal.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Savings goal not found" });
      }

      // Verify account ownership if changing accountId
      if (input.accountId !== undefined) {
        const account = await ctx.db.account.findFirst({
          where: { id: input.accountId, userId: ctx.session.user.id },
        });
        if (!account) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Account not found or access denied",
          });
        }
      }

      const data: Parameters<typeof ctx.db.savingsGoal.update>[0]["data"] = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.targetAmount !== undefined) data.targetAmount = input.targetAmount;
      if (input.deadline !== undefined) data.deadline = input.deadline;
      if (input.accountId !== undefined) data.accountId = input.accountId;
      if (input.status !== undefined) data.status = input.status;

      return ctx.db.savingsGoal.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data,
      });
    }),

  delete: protectedProcedure.input(z.object({ id: objectId })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.savingsGoal.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
    });
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Savings goal not found" });
    }
    await ctx.db.savingsGoal.delete({ where: { id: input.id, userId: ctx.session.user.id } });
    return { success: true };
  }),

  updateProgress: protectedProcedure
    .input(
      z.object({
        id: objectId,
        currentAmount: z.number().min(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.savingsGoal.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Savings goal not found" });
      }

      // Auto-complete goal when target is reached
      const newStatus =
        input.currentAmount >= existing.targetAmount ? "COMPLETED" : existing.status;

      return ctx.db.savingsGoal.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: {
          currentAmount: input.currentAmount,
          status: newStatus,
        },
      });
    }),

  getProgress: protectedProcedure
    .input(z.object({ id: objectId }))
    .query(async ({ ctx, input }) => {
      const goal = await ctx.db.savingsGoal.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!goal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Savings goal not found" });
      }

      const percentComplete =
        goal.targetAmount > 0
          ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
          : 0;

      const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

      const now = new Date();
      let daysRemaining: number | null = null;
      if (goal.deadline !== null && goal.deadline !== undefined) {
        daysRemaining = Math.ceil(
          (goal.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
      }

      return {
        ...goal,
        percentComplete,
        remaining,
        daysRemaining,
      };
    }),

  getProgressWithProjection: protectedProcedure
    .input(z.object({ id: objectId }))
    .query(async ({ ctx, input }) => {
      const goal = await ctx.db.savingsGoal.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        select: { id: true, currentAmount: true, targetAmount: true, deadline: true },
      });

      if (!goal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Savings goal not found" });
      }

      const percentComplete =
        goal.targetAmount > 0
          ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
          : 0;

      const remainingAmount = Math.max(goal.targetAmount - goal.currentAmount, 0);

      const now = new Date();
      let daysRemaining: number | null = null;
      if (goal.deadline !== null) {
        daysRemaining = Math.ceil(
          (goal.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
      }

      // Burn rate projection pattern from project.ts:10-87
      const MS_PER_DAY = 1000 * 60 * 60 * 24;
      const burnRatePerDay =
        daysRemaining !== null && daysRemaining > 0 ? remainingAmount / daysRemaining : 0;

      const estimatedCompletionDate =
        burnRatePerDay > 0 && remainingAmount > 0
          ? new Date(now.getTime() + (remainingAmount / burnRatePerDay) * MS_PER_DAY)
          : goal.currentAmount >= goal.targetAmount
            ? now
            : null;

      return {
        ...goal,
        progressPercent: percentComplete,
        remainingAmount,
        daysRemaining,
        estimatedCompletionDate,
      };
    }),

  contribute: protectedProcedure
    .input(
      z.object({
        id: objectId,
        amount: z.number().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const goal = await ctx.db.savingsGoal.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!goal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Savings goal not found" });
      }

      // Find account to verify it exists and belongs to user
      if (goal.accountId) {
        const account = await ctx.db.account.findFirst({
          where: { id: goal.accountId, userId: ctx.session.user.id },
        });
        if (!account) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Associated account not found or access denied",
          });
        }
      }

      const previousAmount = goal.currentAmount;
      const targetAmount = goal.targetAmount;
      const previousPercentComplete =
        targetAmount > 0 ? Math.min(Math.round((previousAmount / targetAmount) * 100), 100) : 0;

      const newAmount = previousAmount + input.amount;
      const remainingAmount = Math.max(targetAmount - newAmount, 0);
      const newPercentComplete =
        targetAmount > 0 ? Math.min(Math.round((newAmount / targetAmount) * 100), 100) : 0;

      // Check milestones without changing database status
      const milestoneReached =
        previousPercentComplete < 100 && newPercentComplete >= 100
          ? "100_PERCENT"
          : previousPercentComplete < 75 && newPercentComplete >= 75
            ? "75_PERCENT"
            : previousPercentComplete < 50 && newPercentComplete >= 50
              ? "50_PERCENT"
              : previousPercentComplete < 25 && newPercentComplete >= 25
                ? "25_PERCENT"
                : null;

      // Determine new status in database (only COMPLETED can be updated)
      let newStatus = goal.status;
      if (newAmount >= targetAmount) {
        newStatus = "COMPLETED";
      }

      const updatedGoal = await ctx.db.savingsGoal.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: {
          currentAmount: newAmount,
          status: newStatus,
        },
      });

      return {
        ...updatedGoal,
        contributionAmount: input.amount,
        previousAmount,
        remainingAmount,
        targetAmount,
        previousPercentComplete,
        newPercentComplete,
        milestoneReached,
      };
    }),

  calculateMonthlySavings: protectedProcedure
    .input(
      z.object({
        targetAmount: z.number().positive(),
        deadline: z.date(),
        startDate: z.date().optional(),
      }),
    )
    .query(async ({ input }) => {
      const MS_PER_DAY = 1000 * 60 * 60 * 24;

      const now = new Date();
      const daysRemaining = Math.ceil((input.deadline.getTime() - now.getTime()) / MS_PER_DAY);

      let monthlySavings: number;
      let estimatedCompletionDate: Date | null = null;

      if (daysRemaining <= 0) {
        monthlySavings = 0;
        estimatedCompletionDate = now;
      } else {
        const monthsRemaining = Math.max(1, daysRemaining / 30);
        monthlySavings = Math.ceil(input.targetAmount / monthsRemaining);
        estimatedCompletionDate = new Date(
          now.getTime() + (input.targetAmount / monthlySavings) * daysRemaining,
        );
      }

      return {
        monthlySavings,
        daysRemaining,
        estimatedCompletionDate,
      };
    }),
});
