/**
 * Dashboard analytics types shared between web and mobile
 */

export type ChartRange =
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "LAST_3_MONTHS"
  | "LAST_6_MONTHS"
  | "LAST_1_YEAR"
  | "CUSTOM";

/**
 * Input filter parameters for dashboard analytics queries
 */
export interface DashboardFilterInput {
  dateFrom: Date | null;
  dateTo: Date | null;
  accountId?: string;
  category?: string;
}

/**
 * Individual data point for line/area/bar charts (used by Recharts and Victory Native)
 */
export interface ChartDataPoint {
  date: string; // ISO format YYYY-MM-DD
  value: number;
}

/**
 * Complete dashboard analytics output from tRPC procedure
 */
export interface DashboardAnalyticsOutput {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  transactionCount: number;
  budgetStatus: {
    onTrack: number;
    warning: number;
    overBudget: number;
  };
  chartData: {
    income: ChartDataPoint[];
    expense: ChartDataPoint[];
    category: ChartDataPoint[];
    budget: ChartDataPoint[];
    cashFlow: ChartDataPoint[];
  };
}
