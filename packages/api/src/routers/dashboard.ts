// packages/api/src/routers/dashboard.ts
import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import type { DashboardAnalyticsAI } from "@finance/types";
import {
  buildBudgetRecommendations,
  calculateAverages,
  calculateFinancialHealthScore,
  detectAnomalies,
  detectTrends,
  forecastSpending,
} from "@finance/utils";
import { getOpenRouterSuggestions } from "../lib/openrouter.js";

export const dashboardRouter = router({
  /**
   * Get dashboard analytics: total balance, income, expense, cash flow,
   * budget status, and chart data for all 5 charts
   */
  getAnalytics: protectedProcedure
    .input(
      z.object({
        dateFrom: z.date().nullish(),
        dateTo: z.date().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Set default date range (last 30 days) if not provided
      const dateFrom = input.dateFrom ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dateTo = input.dateTo ?? new Date();

      // Fetch active accounts to calculate total balance
      const accounts = await ctx.db.account.findMany({
        where: { userId, isActive: true },
        select: { balance: true },
      });
      const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

      // Fetch budget first to get its date range for transaction query
      const budgets = await ctx.db.budget.findMany({
        where: { userId },
        select: { id: true, items: true, startDate: true, endDate: true },
      });

      // Aggregate income and expenses using Promise.all to prevent race conditions
      const [transactionsResult] = await Promise.all([
        ctx.db.transaction.findMany({
          where: {
            userId,
            date: { gte: dateFrom, lte: dateTo },
          },
          orderBy: { date: "desc" },
        }),
      ]);

      const totals = transactionsResult.reduce(
        (acc, t) => {
          if (t.type === "INCOME") {
            acc.totalIncome += t.amount;
          } else if (t.type === "EXPENSE") {
            acc.totalExpense += t.amount;
          } else if (t.type === "TRANSFER") {
            acc.totalTransfer += t.amount;
          }
          return acc;
        },
        { totalIncome: 0, totalExpense: 0, totalTransfer: 0 },
      );

      const netCashFlow = totals.totalIncome - totals.totalExpense;

      // Calculate budget status
      let budgetOnTrack = 0;
      let budgetWarning = 0;
      let budgetOverBudget = 0;

      for (const budget of budgets) {
        // Fetch transactions for budget's date range
        const budgetTransactions = await ctx.db.transaction.findMany({
          where: {
            userId,
            type: "EXPENSE",
            date: {
              gte: budget.startDate,
              lte: budget.endDate ?? new Date(),
            },
          },
          select: { category: true, amount: true },
        });

        // Build category → total spent map
        const spentMap: Record<string, number> = {};
        for (const tx of budgetTransactions) {
          if (tx.category) {
            const current = spentMap[tx.category] ?? 0;
            spentMap[tx.category] = current + tx.amount;
          }
        }

        // Helper function for robust category matching (3-tier: exact, case-insensitive, partial)
        const findCategorySpent = (
          categoryName: string,
          spentMap: Record<string, number>,
        ): number => {
          // Exact match first
          if (spentMap[categoryName] !== undefined) {
            return spentMap[categoryName];
          }

          // Case-insensitive match
          const lowerName = categoryName.toLowerCase();
          for (const [txCategory, amount] of Object.entries(spentMap)) {
            if (txCategory && txCategory.toLowerCase() === lowerName) {
              return amount;
            }
          }

          // Partial match: check if item name is contained in transaction category or vice versa
          for (const [txCategory, amount] of Object.entries(spentMap)) {
            if (txCategory) {
              if (
                txCategory.toLowerCase().includes(lowerName) ||
                lowerName.includes(txCategory.toLowerCase())
              ) {
                return amount;
              }
            }
          }

          return 0;
        };

        // Calculate total spent for this budget
        const totalBudgeted = budget.items.reduce(
          (sum: number, item: { budgeted: number }) => sum + item.budgeted,
          0,
        );
        const totalSpent = budget.items.reduce(
          (sum: number, item: { name: string }) => sum + findCategorySpent(item.name, spentMap),
          0,
        );

        // Calculate budget status percentage
        const percentage =
          totalBudgeted > 0 ? Math.min(100, Math.round((totalSpent / totalBudgeted) * 100)) : 0;

        // Update budget status counters
        if (percentage >= 100) {
          budgetOverBudget++;
        } else if (percentage >= 75) {
          budgetWarning++;
        } else {
          budgetOnTrack++;
        }
      }

      // Aggregate chart data by date
      const chartDataMap = new Map<string, { income: number; expense: number; category: number }>();
      for (const tx of transactionsResult) {
        const dateStr = tx.date.toISOString().split("T")[0];
        if (!dateStr) continue;

        const currentData = chartDataMap.get(dateStr);
        if (!currentData) {
          chartDataMap.set(dateStr, { income: 0, expense: 0, category: 0 });
        }

        const data = chartDataMap.get(dateStr)!;
        if (tx.type === "INCOME") {
          data.income += tx.amount;
        } else if (tx.type === "EXPENSE") {
          data.expense += tx.amount;
        }
      }

      // Convert to sorted arrays for charts
      const sortedDates = Array.from(chartDataMap.keys())
        .filter((d): d is string => d !== undefined)
        .sort();
      const sortedChartDates = sortedDates.map((date) => ({
        date,
        income: chartDataMap.get(date)!.income,
        expense: chartDataMap.get(date)!.expense,
      }));

      // Budget chart data: track cumulative budget over time
      const budgetChartMap = new Map<string, number>();
      const remainingBudgetByDate = new Map<string, number>();

      for (let i = 0; i < sortedDates.length; i++) {
        const currentDate = sortedDates[i];
        const currentBudgetSpent = Array.from(chartDataMap.values())
          .slice(0, i + 1)
          .reduce((sum, data) => sum + data.expense, 0);

        // Calculate remaining budget from all budgets (simplified: 80% of income saved)
        const remainingBudget = Math.max(
          0,
          Math.round((totals.totalIncome - currentBudgetSpent) * 0.8),
        );

        if (currentDate) {
          budgetChartMap.set(currentDate, remainingBudget);
          remainingBudgetByDate.set(currentDate, remainingBudget);
        }
      }

      const budgetChartData: Array<{ date: string; value: number }> = sortedDates.map((date) => ({
        date,
        value: date ? (remainingBudgetByDate.get(date) ?? 0) : 0,
      }));

      // Category chart data: top spending categories
      const categoryMap = new Map<string, number>();
      for (const tx of transactionsResult) {
        if (tx.type === "EXPENSE" && tx.category) {
          const current = categoryMap.get(tx.category) ?? 0;
          categoryMap.set(tx.category, current + tx.amount);
        }
      }

      const sortedCategories = Array.from(categoryMap.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, amount]) => ({ name, value: amount }));

      // Cash flow chart data
      const cashFlowMap = new Map<string, number>();
      for (let i = 0; i < sortedDates.length; i++) {
        const currentDate = sortedDates[i];
        if (!currentDate) continue;

        const incomeToDate = Array.from(chartDataMap.values())
          .slice(0, i + 1)
          .reduce((sum, data) => sum + data.income, 0);

        const expenseToDate = Array.from(chartDataMap.values())
          .slice(0, i + 1)
          .reduce((sum, data) => sum + data.expense, 0);

        cashFlowMap.set(currentDate, incomeToDate - expenseToDate);
      }

      const cashFlowChartData: Array<{ date: string; value: number }> = sortedDates
        .filter((d): d is string => d !== undefined)
        .map((date) => ({
          date,
          value: cashFlowMap.get(date) ?? 0,
        }));

      return {
        totalBalance,
        totalIncome: totals.totalIncome,
        totalExpense: totals.totalExpense,
        netCashFlow,
        transactionCount: transactionsResult.length,
        budgetStatus: {
          onTrack: budgetOnTrack,
          warning: budgetWarning,
          overBudget: budgetOverBudget,
        },
        chartData: {
          income: sortedChartDates.map((d) => ({ date: d.date, value: d.income })),
          expense: sortedChartDates.map((d) => ({ date: d.date, value: d.expense })),
          category: sortedCategories,
          budget: budgetChartData,
          cashFlow: cashFlowChartData,
        },
      };
    }),

  getAIAnalytics: protectedProcedure
    .input(
      z.object({
        dateFrom: z.date().nullish(),
        dateTo: z.date().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const dateFrom = input.dateFrom ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const dateTo = input.dateTo ?? new Date();

      const [transactions, budgets, debts] = await Promise.all([
        ctx.db.transaction.findMany({
          where: {
            userId,
            date: { gte: dateFrom, lte: dateTo },
          },
          select: {
            id: true,
            date: true,
            amount: true,
            type: true,
            category: true,
          },
          orderBy: { date: "asc" },
        }),
        ctx.db.budget.findMany({
          where: {
            userId,
            startDate: { lte: dateTo },
            OR: [{ endDate: null }, { endDate: { gte: dateFrom } }],
          },
          select: { items: true },
        }),
        ctx.db.debt.findMany({
          where: { userId },
          select: { remaining: true },
        }),
      ]);

      const txInput = transactions.map((tx) => ({
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        type: tx.type,
        category: tx.category,
      }));

      const spendingPatterns = calculateAverages(txInput);
      const categoryTrends = detectTrends(txInput);
      const anomalies = detectAnomalies(txInput);
      const forecast = forecastSpending(txInput, { method: "moving-average", periods: 3 });
      const budgetRecommendations = buildBudgetRecommendations(categoryTrends);

      const totalIncome = txInput
        .filter((tx) => tx.type === "INCOME")
        .reduce((sum, tx) => sum + tx.amount, 0);
      const totalExpense = txInput
        .filter((tx) => tx.type === "EXPENSE")
        .reduce((sum, tx) => sum + tx.amount, 0);
      const totalBudgeted = budgets.reduce(
        (sum, budget) =>
          sum +
          budget.items.reduce(
            (itemsTotal: number, item: { budgeted: number }) => itemsTotal + item.budgeted,
            0,
          ),
        0,
      );
      const totalDebtRemaining = debts.reduce((sum, debt) => sum + debt.remaining, 0);

      const financialHealth = calculateFinancialHealthScore({
        totalIncome,
        totalExpense,
        totalBudgeted,
        totalDebtRemaining,
      });

      const providerSuggestions = await getOpenRouterSuggestions({
        categoryTrends,
        financialHealthScore: financialHealth.score,
      });

      const output: DashboardAnalyticsAI = {
        provider: providerSuggestions.length > 0 ? "OPENROUTER_HYBRID" : "RULE_BASED",
        spendingPatterns,
        categoryTrends,
        budgetRecommendations,
        anomalies,
        forecast,
        financialHealth: {
          ...financialHealth,
          suggestions: [
            ...financialHealth.suggestions,
            ...providerSuggestions.filter(
              (suggestion) => !financialHealth.suggestions.includes(suggestion),
            ),
          ].slice(0, 8),
        },
        providerSuggestions,
      };

      return output;
    }),

  /**
   * Get recent transactions for charts and list view
   */
  getRecentTransactions: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Determine cursor or use last ID
      const where: Record<string, unknown> = { userId };
      if (input.cursor) {
        // Start after the cursor (higher date)
        where.date = {
          lte: new Date(input.cursor),
        };
      }

      // Fetch transactions with cursor pagination
      const transactionResult = await ctx.db.transaction.findMany({
        where,
        take: input.limit + 1,
        orderBy: { date: "desc" },
        select: {
          id: true,
          amount: true,
          currency: true,
          date: true,
          type: true,
          category: true,
          subcategory: true,
          project: true,
          tags: true,
          description: true,
          account: {
            select: { name: true, type: true },
          },
        },
      });

      // Determine next cursor: last item's ID
      const lastTransaction =
        transactionResult.length > input.limit
          ? transactionResult[transactionResult.length - 1]
          : undefined;

      const nextCursor = lastTransaction?.id ?? null;

      // Filter out the last item if we hit the limit
      const transactions =
        transactionResult.length > input.limit ? transactionResult.slice(0, -1) : transactionResult;

      // Filter out the last item if we hit the limit
      const hasNextPage = transactions.length > input.limit;
      if (hasNextPage) {
        transactions.pop();
      }

      return {
        items: transactions,
        nextCursor,
        hasNextPage,
      };
    }),

  /**
   * Get quick actions for dashboard
   */
  getQuickActions: protectedProcedure.query(async () => {
    return [
      {
        label: "Add Transaction",
        icon: "Plus",
        route: "/transactions/new",
        description: "Record income or expense",
      },
      {
        label: "Transfer Money",
        icon: "ArrowsLeftRight",
        route: "/accounts/transfer",
        description: "Move money between accounts",
      },
      {
        label: "View Budget",
        icon: "PieChart",
        route: "/budget",
        description: "Check budget progress",
      },
      {
        label: "View Projects",
        icon: "FolderOpen",
        route: "/projects",
        description: "Track project expenses",
      },
    ];
  }),
});
