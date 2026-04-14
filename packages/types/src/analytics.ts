export type AnalyticsTransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

export interface AnalyticsTransactionInput {
  id?: string;
  date: Date | string;
  amount: number;
  type: AnalyticsTransactionType;
  category?: string | null;
}

export interface SpendingPatterns {
  weekdayAverage: number;
  weekendAverage: number;
  timeOfDayAverage: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };
}

export type TrendDirection = "INCREASING" | "DECREASING" | "STABLE";

export interface CategoryTrend {
  category: string;
  previousPeriodAmount: number;
  currentPeriodAmount: number;
  changeAmount: number;
  changePercent: number;
  direction: TrendDirection;
}

export interface SpendingAnomaly {
  id?: string;
  date: string;
  category: string;
  amount: number;
  expectedRangeMax: number;
  deviation: number;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

export interface SpendingForecast {
  method: "moving-average" | "linear-regression";
  predictedNextMonth: number;
  monthlySeries: Array<{ month: string; total: number }>;
}

export interface BudgetRecommendation {
  category: string;
  recommendedBudget: number;
  currentAverage: number;
  rationale: string;
}

export interface FinancialHealthBreakdown {
  budgetAdherence: number;
  savingsRate: number;
  debtRatio: number;
}

export interface FinancialHealthScore {
  score: number;
  breakdown: FinancialHealthBreakdown;
  suggestions: string[];
}

export interface DashboardAnalyticsAI {
  provider: "RULE_BASED" | "OPENROUTER_HYBRID";
  spendingPatterns: SpendingPatterns;
  categoryTrends: CategoryTrend[];
  budgetRecommendations: BudgetRecommendation[];
  anomalies: SpendingAnomaly[];
  forecast: SpendingForecast;
  financialHealth: FinancialHealthScore;
  providerSuggestions: string[];
}
