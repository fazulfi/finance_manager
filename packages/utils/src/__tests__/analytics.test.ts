import { describe, expect, it } from "vitest";

import {
  buildBudgetRecommendations,
  calculateAverages,
  calculateFinancialHealthScore,
  detectAnomalies,
  detectTrends,
  forecastSpending,
} from "../analytics";

const sample = [
  { id: "1", date: "2026-02-03T08:00:00.000Z", amount: 60, type: "EXPENSE" as const, category: "Food" },
  { id: "2", date: "2026-02-10T19:00:00.000Z", amount: 80, type: "EXPENSE" as const, category: "Food" },
  { id: "3", date: "2026-03-05T13:00:00.000Z", amount: 100, type: "EXPENSE" as const, category: "Food" },
  { id: "4", date: "2026-03-06T21:00:00.000Z", amount: 40, type: "EXPENSE" as const, category: "Transport" },
  { id: "5", date: "2026-03-07T23:00:00.000Z", amount: 400, type: "EXPENSE" as const, category: "Shopping" },
  { id: "6", date: "2026-03-08T09:00:00.000Z", amount: 2500, type: "INCOME" as const, category: "Salary" },
];

describe("analytics utils", () => {
  it("calculates weekday/weekend and time-of-day averages", () => {
    const result = calculateAverages(sample);
    expect(result.weekdayAverage).toBeGreaterThan(0);
    expect(result.weekendAverage).toBeGreaterThan(0);
    expect(result.timeOfDayAverage.night).toBeGreaterThan(0);
  });

  it("detects category trends between latest 2 months", () => {
    const trends = detectTrends(sample);
    const food = trends.find((item) => item.category === "Food");
    expect(food?.direction).toBe("DECREASING");
  });

  it("detects spending anomalies", () => {
    const anomalies = detectAnomalies([
      ...sample,
      { id: "7", date: "2026-03-09T12:00:00.000Z", amount: 50, type: "EXPENSE" as const, category: "Food" },
      { id: "8", date: "2026-03-10T12:00:00.000Z", amount: 55, type: "EXPENSE" as const, category: "Food" },
      { id: "9", date: "2026-03-11T12:00:00.000Z", amount: 65, type: "EXPENSE" as const, category: "Food" },
    ]);
    expect(anomalies.some((item) => item.category === "Shopping")).toBe(true);
  });

  it("forecasts next month spending with moving average", () => {
    const forecast = forecastSpending(sample, { method: "moving-average", periods: 2 });
    expect(forecast.predictedNextMonth).toBeGreaterThan(0);
  });

  it("builds budget recommendations from trends", () => {
    const recs = buildBudgetRecommendations(detectTrends(sample));
    expect(recs.length).toBeGreaterThan(0);
  });

  it("calculates financial health score with suggestions", () => {
    const score = calculateFinancialHealthScore({
      totalIncome: 3000,
      totalExpense: 2200,
      totalBudgeted: 2000,
      totalDebtRemaining: 3500,
    });
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(score.suggestions.length).toBeGreaterThan(0);
  });
});
