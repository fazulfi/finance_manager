// packages/api/src/routers/export.ts
import { Readable } from "stream";
import { z } from "zod";

import { router, protectedProcedure, objectId } from "../trpc.js";

// CSV Formatting Utilities
function formatCSVHeader(headers: string[]): string {
  // Add BOM for UTF-8 Excel compatibility
  return "\uFEFF" + headers.join(",");
}

function formatCSVRow(fields: (string | number | null | undefined)[]): string {
  const escapedFields = fields.map((field) => {
    const value = field ?? "";
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (
      value.toString().includes(",") ||
      value.toString().includes('"') ||
      value.toString().includes("\n")
    ) {
      return `"${value.toString().replace(/"/g, '""')}"`;
    }
    return value.toString();
  });
  return escapedFields.join(",");
}

async function* createCSVStream(
  headers: string[],
  data: any[],
  chunkSize: number = 1000,
): AsyncGenerator<string, void, unknown> {
  // Yield header row
  yield formatCSVHeader(headers);

  // Yield data rows in chunks
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    for (const row of chunk) {
      yield formatCSVRow(
        headers.map((header) => {
          const field = row[header];
          return field === undefined || field === null ? null : field;
        }),
      );
    }
  }
}

const TransactionTypeEnum = z.enum(["INCOME", "EXPENSE", "TRANSFER"]);

export const exportRouter = router({
  transactions: protectedProcedure
    .input(
      z.object({
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        accountId: objectId.optional(),
        category: objectId.optional(),
        type: TransactionTypeEnum.optional(),
        search: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Build where clause
      const where: any = { userId };

      if (input.dateFrom || input.dateTo) {
        where.date = {};
        if (input.dateFrom) where.date.gte = input.dateFrom;
        if (input.dateTo) where.date.lte = input.dateTo;
      }

      if (input.accountId) where.accountId = input.accountId;
      if (input.category) where.category = input.category;
      if (input.type) where.type = input.type;
      if (input.search) {
        where.OR = [
          { category: { contains: input.search, mode: "insensitive" as const } },
          { description: { contains: input.search, mode: "insensitive" as const } },
        ];
      }

      // Fetch all matching transactions
      const transactions = await ctx.db.transaction.findMany({
        where,
        orderBy: { date: "desc" },
        include: {
          account: true,
        },
      });

      if (transactions.length === 0) {
        throw new Error("No transactions found matching the criteria");
      }

      // Map transactions to CSV format
      const csvData = transactions.map((t) => ({
        date: t.date.toISOString().split("T")[0],
        description: t.description ?? "",
        amount: t.amount,
        currency: t.currency,
        type: t.type,
        category: t.category ?? "",
        accountId: t.accountId ?? "",
        projectId: t.project ?? "",
        transferTo: t.transferTo ?? "",
        tags: t.tags?.join(";") ?? "",
      }));

      // Convert to stream
      const stream = Readable.from(
        createCSVStream(
          [
            "date",
            "description",
            "amount",
            "currency",
            "type",
            "category",
            "accountId",
            "projectId",
            "transferTo",
            "tags",
          ],
          csvData,
        ),
      );

      return {
        stream,
        contentType: "text/csv",
        filename: `transactions_${new Date().toISOString().split("T")[0]}.csv`,
      };
    }),

  accounts: protectedProcedure
    .input(
      z.object({
        type: z.enum(["CHECKING", "SAVINGS", "CREDIT", "INVESTMENT", "CASH", "OTHER"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const where: any = { userId };
      if (input.type) where.type = input.type;

      const accounts = await ctx.db.account.findMany({
        where,
        orderBy: { name: "asc" },
      });

      if (accounts.length === 0) {
        throw new Error("No accounts found matching the criteria");
      }

      // Map accounts to CSV format
      const csvData = accounts.map((a) => ({
        name: a.name,
        description: a.description ?? "",
        type: a.type,
        currency: a.currency,
        initialBalance: a.initialBalance,
        currentBalance: a.balance,
        isActive: a.isActive,
      }));

      // Convert to stream
      const stream = Readable.from(
        createCSVStream(
          [
            "name",
            "description",
            "type",
            "currency",
            "initialBalance",
            "currentBalance",
            "isActive",
          ],
          csvData,
          500,
        ),
      );

      return {
        stream,
        contentType: "text/csv",
        filename: `accounts_${new Date().toISOString().split("T")[0]}.csv`,
      };
    }),

  budgets: protectedProcedure
    .input(
      z.object({
        period: z.enum(["WEEKLY", "MONTHLY"]),
        start: z.date(),
        end: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const where: any = {
        userId,
        type: input.period,
        startDate: input.start,
        endDate: input.end,
      };

      const budgets = await ctx.db.budget.findMany({
        where,
        orderBy: { name: "asc" },
      });

      if (budgets.length === 0) {
        throw new Error("No budgets found matching the criteria");
      }

      // Map budgets to CSV format
      const csvData = budgets.map((b) => {
        const items = b.items || []; // BudgetItem is embedded type
        const totalBudgeted = items.reduce((sum: number, item: any) => sum + item.budgeted, 0);
        const totalSpent = items.reduce((sum: number, item: any) => sum + (item.spent ?? 0), 0);

        // Get unique category names from items
        const categoryNames = Array.from(new Set(items.map((item: any) => item.name)));

        return {
          name: b.name,
          type: b.type,
          category: categoryNames.join(", "),
          budgeted: totalBudgeted,
          spent: totalSpent,
          remaining: totalBudgeted - totalSpent,
          percentage: totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0,
        };
      });

      // Convert to stream
      const stream = Readable.from(
        createCSVStream(
          ["name", "type", "category", "budgeted", "spent", "remaining", "percentage"],
          csvData,
          100,
        ),
      );

      return {
        stream,
        contentType: "text/csv",
        filename: `budgets_${input.period}_${new Date().toISOString().split("T")[0]}.csv`,
      };
    }),
});
