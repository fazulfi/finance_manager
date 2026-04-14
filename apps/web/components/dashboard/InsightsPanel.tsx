"use client";

import type { DashboardAnalyticsAI } from "@finance/types";

interface InsightsPanelProps {
  patterns: DashboardAnalyticsAI["spendingPatterns"];
  forecast: DashboardAnalyticsAI["forecast"];
  financialHealth: DashboardAnalyticsAI["financialHealth"];
  provider: DashboardAnalyticsAI["provider"];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function getTopTimeOfDay(
  value: DashboardAnalyticsAI["spendingPatterns"]["timeOfDayAverage"],
): "morning" | "afternoon" | "evening" | "night" {
  const entries = Object.entries(value) as Array<["morning" | "afternoon" | "evening" | "night", number]>;
  const winner = entries.sort((a, b) => b[1] - a[1])[0];
  return winner ? winner[0] : "morning";
}

export function InsightsPanel({
  patterns,
  forecast,
  financialHealth,
  provider,
}: InsightsPanelProps): React.JSX.Element {
  const topTime = getTopTimeOfDay(patterns.timeOfDayAverage);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-foreground">AI Insights</h3>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {provider === "OPENROUTER_HYBRID" ? "OpenRouter + Rules" : "Rule-based"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Weekday Average</p>
          <p className="mt-1 text-lg font-semibold">{formatCurrency(patterns.weekdayAverage)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Weekend Average</p>
          <p className="mt-1 text-lg font-semibold">{formatCurrency(patterns.weekendAverage)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Top Spend Time</p>
          <p className="mt-1 text-lg font-semibold capitalize">{topTime}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Next Month Forecast</p>
          <p className="mt-1 text-lg font-semibold">{formatCurrency(forecast.predictedNextMonth)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-muted/50 p-3">
        <p className="text-sm text-muted-foreground">Financial Health Score</p>
        <p className="text-2xl font-bold text-foreground">{financialHealth.score}/100</p>
      </div>
    </div>
  );
}
