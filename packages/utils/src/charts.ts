import { TransactionType } from "@finance/types";
import type { ChartDataPoint } from "@finance/types";
import type { Budget, Transaction } from "@finance/types";

/**
 * Get date range from chart range preset
 */
export function formatDateRanges(range: string): { dateFrom: Date; dateTo: Date } {
  const dateTo = new Date();
  const dateFrom = new Date(dateTo);

  switch (range) {
    case "LAST_7_DAYS":
      dateFrom.setDate(dateTo.getDate() - 7);
      break;
    case "LAST_30_DAYS":
      dateFrom.setDate(dateTo.getDate() - 30);
      break;
    case "LAST_3_MONTHS":
      dateFrom.setMonth(dateTo.getMonth() - 3);
      break;
    case "LAST_6_MONTHS":
      dateFrom.setMonth(dateTo.getMonth() - 6);
      break;
    case "LAST_1_YEAR":
      dateFrom.setFullYear(dateTo.getFullYear() - 1);
      break;
    case "CUSTOM":
      dateFrom.setDate(dateTo.getDate() - 30);
      break;
    default:
      dateFrom.setDate(dateTo.getDate() - 30);
  }

  return { dateFrom, dateTo };
}

/**
 * Aggregate expenses by category for pie chart data
 */
export function groupByCategory(transactions: Transaction[]): Map<string, number> {
  const categoryMap = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type === TransactionType.EXPENSE && transaction.category) {
      const current = categoryMap.get(transaction.category) || 0;
      categoryMap.set(transaction.category, current + transaction.amount);
    }
  }

  return categoryMap;
}

/**
 * Aggregate transactions into chart-ready data points for line/area charts
 */
export function aggregateChartData(
  transactions: Transaction[],
  range: string,
  type: "INCOME" | "EXPENSE" | "CASH_FLOW",
): ChartDataPoint[] {
  const { dateFrom, dateTo } = formatDateRanges(range);
  const dataMap = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.date < dateFrom || transaction.date > dateTo) {
      continue;
    }

    const dateKey = transaction.date.toISOString().split("T")[0] as string;

    if (type === "CASH_FLOW") {
      const current = dataMap.get(dateKey) || 0;
      dataMap.set(dateKey, current + transaction.amount);
    } else if (
      (type === "INCOME" && transaction.type === TransactionType.INCOME) ||
      (type === "EXPENSE" && transaction.type === TransactionType.EXPENSE)
    ) {
      const current = dataMap.get(dateKey) || 0;
      dataMap.set(dateKey, current + transaction.amount);
    }
  }

  // Convert map to sorted array (chronological)
  return Array.from(dataMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate budget progress data from budget procedure outputs
 */
export function calculateBudgetProgress(
  _budgets: Budget[],
  recentBudgets: { id: string; name: string; totalBudgeted: number; spent: number }[],
): ChartDataPoint[] {
  return recentBudgets.map((budget, index) => ({
    date: `budget_${index}`,
    value: budget.spent,
  }));
}

/**
 * Calculate cumulative cash flow timeline
 */
export function calculateCashFlow(transactions: Transaction[], range: string): ChartDataPoint[] {
  const { dateFrom, dateTo } = formatDateRanges(range);
  let cumulative = 0;
  const dataMap = new Map<string, number>();

  const sortedTransactions = transactions
    .filter((t) => t.date >= dateFrom && t.date <= dateTo)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const transaction of sortedTransactions) {
    cumulative +=
      transaction.type === TransactionType.INCOME ? transaction.amount : -transaction.amount;
    const dateKey = transaction.date.toISOString().split("T")[0] as string;
    dataMap.set(dateKey, cumulative);
  }

  return Array.from(dataMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
