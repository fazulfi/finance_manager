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

// ── Default Categories Seeder ────────────────────────────────────────────────────
// Creates 19 default expense categories for new users on signup

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Housing", icon: "🏠", color: "#ef4444" },
  { name: "Food & Dining", icon: "🍽️", color: "#dc2626" },
  { name: "Transport", icon: "🚗", color: "#f97316" },
  { name: "Utilities", icon: "💡", color: "#eab308" },
  { name: "Healthcare", icon: "🏥", color: "#22c55e" },
  { name: "Entertainment", icon: "🎮", color: "#06b6d4" },
  { name: "Education", icon: "📚", color: "#3b82f6" },
  { name: "Personal Care", icon: "💅", color: "#8b5cf6" },
  { name: "Insurance", icon: "🛡️", color: "#ec4899" },
  { name: "Savings", icon: "💰", color: "#10b981" },
  { name: "Investments", icon: "📈", color: "#14b8a6" },
  { name: "Gifts", icon: "🎁", color: "#f43f5e" },
  { name: "Dining Out", icon: "🍕", color: "#f97316" },
  { name: "Groceries", icon: "🛒", color: "#84cc16" },
  { name: "Clothing", icon: "👕", color: "#6366f1" },
  { name: "Transport/Misc", icon: "🚕", color: "#64748b" },
  { name: "Home Maintenance", icon: "🔧", color: "#d97706" },
  { name: "Travel", icon: "✈️", color: "#0891b2" },
  { name: "Other", icon: "📦", color: "#6b7280" },
];

export async function seedDefaultCategories(db: any, userId: string): Promise<void> {
  const existingDefaultCount = await db.category.count({
    where: {
      userId,
      type: "EXPENSE",
      isDefault: true,
    },
  });

  if (existingDefaultCount > 0) {
    return;
  }

  await db.category.createMany({
    data: DEFAULT_EXPENSE_CATEGORIES.map((cat) => ({
      userId,
      name: cat.name,
      type: "EXPENSE",
      icon: cat.icon,
      color: cat.color,
      isDefault: true,
      usageCount: 0,
    })),
  });
}
