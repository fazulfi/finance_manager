import type {
  AnalyticsTransactionInput,
  BudgetRecommendation,
  CategoryTrend,
  FinancialHealthScore,
  SpendingAnomaly,
  SpendingForecast,
  SpendingPatterns,
} from "@finance/types";

type ForecastMethod = "moving-average" | "linear-regression";

interface TrendOptions {
  stableThresholdPercent?: number;
}

interface AnomalyOptions {
  zScoreThreshold?: number;
  minAmount?: number;
}

interface ForecastOptions {
  method?: ForecastMethod;
  periods?: number;
}

function toDate(input: Date | string): Date {
  return input instanceof Date ? input : new Date(input);
}

function getMonthlyExpenseSeries(
  transactions: AnalyticsTransactionInput[],
): Array<{ month: string; total: number }> {
  const monthlyMap = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.type !== "EXPENSE") continue;
    const date = toDate(tx.date);
    if (Number.isNaN(date.getTime())) continue;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + tx.amount);
  }

  return Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));
}

export function calculateAverages(transactions: AnalyticsTransactionInput[]): SpendingPatterns {
  const expenses = transactions.filter((tx) => tx.type === "EXPENSE");
  if (expenses.length === 0) {
    return {
      weekdayAverage: 0,
      weekendAverage: 0,
      timeOfDayAverage: { morning: 0, afternoon: 0, evening: 0, night: 0 },
    };
  }

  let weekdayTotal = 0;
  let weekdayCount = 0;
  let weekendTotal = 0;
  let weekendCount = 0;
  const timeTotals = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const timeCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };

  for (const tx of expenses) {
    const date = toDate(tx.date);
    if (Number.isNaN(date.getTime())) continue;

    const day = date.getDay();
    if (day === 0 || day === 6) {
      weekendTotal += tx.amount;
      weekendCount += 1;
    } else {
      weekdayTotal += tx.amount;
      weekdayCount += 1;
    }

    const hour = date.getHours();
    if (hour >= 5 && hour < 12) {
      timeTotals.morning += tx.amount;
      timeCounts.morning += 1;
    } else if (hour >= 12 && hour < 17) {
      timeTotals.afternoon += tx.amount;
      timeCounts.afternoon += 1;
    } else if (hour >= 17 && hour < 22) {
      timeTotals.evening += tx.amount;
      timeCounts.evening += 1;
    } else {
      timeTotals.night += tx.amount;
      timeCounts.night += 1;
    }
  }

  return {
    weekdayAverage: weekdayCount > 0 ? weekdayTotal / weekdayCount : 0,
    weekendAverage: weekendCount > 0 ? weekendTotal / weekendCount : 0,
    timeOfDayAverage: {
      morning: timeCounts.morning > 0 ? timeTotals.morning / timeCounts.morning : 0,
      afternoon: timeCounts.afternoon > 0 ? timeTotals.afternoon / timeCounts.afternoon : 0,
      evening: timeCounts.evening > 0 ? timeTotals.evening / timeCounts.evening : 0,
      night: timeCounts.night > 0 ? timeTotals.night / timeCounts.night : 0,
    },
  };
}

export function detectTrends(
  transactions: AnalyticsTransactionInput[],
  options: TrendOptions = {},
): CategoryTrend[] {
  const stableThresholdPercent = options.stableThresholdPercent ?? 10;
  const sorted = [...transactions]
    .filter((tx) => tx.type === "EXPENSE" && tx.category)
    .sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime());
  if (sorted.length === 0) return [];

  const monthKeys = Array.from(
    new Set(
      sorted.map((tx) => {
        const date = toDate(tx.date);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }),
    ),
  ).sort();

  if (monthKeys.length < 2) return [];
  const previousMonth = monthKeys[monthKeys.length - 2];
  const currentMonth = monthKeys[monthKeys.length - 1];

  const previous = new Map<string, number>();
  const current = new Map<string, number>();

  for (const tx of sorted) {
    const date = toDate(tx.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const category = tx.category ?? "Uncategorized";

    if (key === previousMonth) {
      previous.set(category, (previous.get(category) ?? 0) + tx.amount);
    } else if (key === currentMonth) {
      current.set(category, (current.get(category) ?? 0) + tx.amount);
    }
  }

  const categories = new Set([...previous.keys(), ...current.keys()]);
  const trends: CategoryTrend[] = [];

  for (const category of categories) {
    const previousAmount = previous.get(category) ?? 0;
    const currentAmount = current.get(category) ?? 0;
    const changeAmount = currentAmount - previousAmount;
    const changePercent =
      previousAmount > 0 ? (changeAmount / previousAmount) * 100 : currentAmount > 0 ? 100 : 0;

    let direction: CategoryTrend["direction"] = "STABLE";
    if (changePercent > stableThresholdPercent) direction = "INCREASING";
    if (changePercent < -stableThresholdPercent) direction = "DECREASING";

    trends.push({
      category,
      previousPeriodAmount: previousAmount,
      currentPeriodAmount: currentAmount,
      changeAmount,
      changePercent,
      direction,
    });
  }

  return trends.sort((a, b) => Math.abs(b.changeAmount) - Math.abs(a.changeAmount));
}

export function detectAnomalies(
  transactions: AnalyticsTransactionInput[],
  options: AnomalyOptions = {},
): SpendingAnomaly[] {
  const zScoreThreshold = options.zScoreThreshold ?? 2;
  const expenses = transactions.filter((tx) => tx.type === "EXPENSE");
  if (expenses.length < 5) return [];

  const amounts = expenses.map((tx) => tx.amount);
  const mean = amounts.reduce((sum, value) => sum + value, 0) / amounts.length;
  const variance =
    amounts.reduce((sum, value) => sum + (value - mean) * (value - mean), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  const minAmount = options.minAmount ?? mean * 1.5;
  const expectedRangeMax = mean + zScoreThreshold * stdDev;

  return expenses
    .filter((tx) => tx.amount >= minAmount && tx.amount > expectedRangeMax)
    .map((tx): SpendingAnomaly => {
      const deviation = stdDev > 0 ? (tx.amount - mean) / stdDev : tx.amount > mean ? 3 : 0;
      const severity: SpendingAnomaly["severity"] =
        deviation >= 3 ? "HIGH" : deviation >= 2.5 ? "MEDIUM" : "LOW";

      const base: SpendingAnomaly = {
        date: toDate(tx.date).toISOString(),
        category: tx.category ?? "Uncategorized",
        amount: tx.amount,
        expectedRangeMax,
        deviation,
        severity,
      };

      return tx.id ? { ...base, id: tx.id } : base;
    })
    .sort((a, b) => b.deviation - a.deviation);
}

export function forecastSpending(
  transactions: AnalyticsTransactionInput[],
  options: ForecastOptions = {},
): SpendingForecast {
  const method = options.method ?? "moving-average";
  const periods = Math.max(2, options.periods ?? 3);
  const monthlySeries = getMonthlyExpenseSeries(transactions);

  if (monthlySeries.length === 0) {
    return { method, predictedNextMonth: 0, monthlySeries: [] };
  }

  const values = monthlySeries.map((entry) => entry.total);
  const recentValues = values.slice(-periods);

  let predicted = 0;
  if (method === "linear-regression" && values.length >= 2) {
    const x = values.map((_, index) => index + 1);
    const y = values;
    const n = x.length;
    const sumX = x.reduce((sum, value) => sum + value, 0);
    const sumY = y.reduce((sum, value) => sum + value, 0);
    const sumXY = x.reduce((sum, value, index) => sum + value * (y[index] ?? 0), 0);
    const sumXX = x.reduce((sum, value) => sum + value * value, 0);
    const denominator = n * sumXX - sumX * sumX;
    const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;
    predicted = slope * (n + 1) + intercept;
  } else {
    predicted = recentValues.reduce((sum, value) => sum + value, 0) / recentValues.length;
  }

  return {
    method,
    predictedNextMonth: Math.max(0, predicted),
    monthlySeries,
  };
}

export function buildBudgetRecommendations(
  trends: CategoryTrend[],
  defaultIncreaseRate = 0.08,
): BudgetRecommendation[] {
  return trends
    .filter((trend) => trend.currentPeriodAmount > 0 || trend.previousPeriodAmount > 0)
    .slice(0, 6)
    .map((trend) => {
      let multiplier = 1;
      let rationale = "Current trend is stable. Keep budget close to recent spending.";

      if (trend.direction === "INCREASING") {
        multiplier = 1 + defaultIncreaseRate;
        rationale = "Spending trend is increasing. Add a small buffer for this category.";
      } else if (trend.direction === "DECREASING") {
        multiplier = 0.95;
        rationale = "Spending trend is decreasing. You can tighten this category budget.";
      }

      const baseline = Math.max(trend.currentPeriodAmount, trend.previousPeriodAmount);
      return {
        category: trend.category,
        currentAverage: (trend.currentPeriodAmount + trend.previousPeriodAmount) / 2,
        recommendedBudget: baseline * multiplier,
        rationale,
      };
    });
}

export function calculateFinancialHealthScore(params: {
  totalIncome: number;
  totalExpense: number;
  totalBudgeted: number;
  totalDebtRemaining: number;
}): FinancialHealthScore {
  const { totalIncome, totalExpense, totalBudgeted, totalDebtRemaining } = params;
  const safeIncome = Math.max(0, totalIncome);
  const savingsRate = safeIncome > 0 ? Math.max(0, (safeIncome - totalExpense) / safeIncome) : 0;

  const budgetAdherenceRaw =
    totalBudgeted > 0 ? Math.max(0, 1 - Math.max(0, totalExpense - totalBudgeted) / totalBudgeted) : 0.5;
  const debtRatioRaw = safeIncome > 0 ? totalDebtRemaining / safeIncome : 1;

  const budgetAdherence = Math.round(Math.min(100, budgetAdherenceRaw * 100));
  const savingsRateScore = Math.round(Math.min(100, Math.max(0, savingsRate * 200)));
  const debtRatioScore = Math.round(Math.min(100, Math.max(0, (1 - Math.min(1, debtRatioRaw)) * 100)));

  const score = Math.round(budgetAdherence * 0.4 + savingsRateScore * 0.35 + debtRatioScore * 0.25);

  const suggestions: string[] = [];
  if (budgetAdherence < 70) suggestions.push("Reduce spending in categories that exceed budget.");
  if (savingsRateScore < 60) suggestions.push("Aim to save at least 20% of monthly income.");
  if (debtRatioScore < 60) suggestions.push("Pay down high-interest debt to improve cash flow.");
  if (suggestions.length === 0) suggestions.push("Great progress. Maintain your current money habits.");

  return {
    score,
    breakdown: {
      budgetAdherence,
      savingsRate: savingsRateScore,
      debtRatio: debtRatioScore,
    },
    suggestions,
  };
}
