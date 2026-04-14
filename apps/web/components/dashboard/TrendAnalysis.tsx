"use client";

import type { DashboardAnalyticsAI } from "@finance/types";

interface TrendAnalysisProps {
  trends: DashboardAnalyticsAI["categoryTrends"];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function TrendAnalysis({ trends }: TrendAnalysisProps): React.JSX.Element {
  if (trends.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">Trend Analysis</h3>
        <p className="mt-3 text-sm text-muted-foreground">Not enough history to detect category trends.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-foreground">Trend Analysis</h3>
      <div className="mt-4 space-y-3">
        {trends.slice(0, 6).map((trend) => (
          <div key={trend.category} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-foreground">{trend.category}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  trend.direction === "INCREASING"
                    ? "bg-rose-100 text-rose-700"
                    : trend.direction === "DECREASING"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-700"
                }`}
              >
                {trend.direction}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatCurrency(trend.previousPeriodAmount)} {"->"} {formatCurrency(trend.currentPeriodAmount)} (
              {trend.changePercent.toFixed(1)}%)
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
