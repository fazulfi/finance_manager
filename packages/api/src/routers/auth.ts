// packages/api/src/routers/auth.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }
    return user;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        image: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data: { name?: string; image?: string } = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.image !== undefined) data.image = input.image;
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          updatedAt: true,
        },
      });
    }),
});
