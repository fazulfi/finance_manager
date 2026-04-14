"use client";

import type { DashboardAnalyticsAI } from "@finance/types";

interface BudgetRecommendationsProps {
  recommendations: DashboardAnalyticsAI["budgetRecommendations"];
  providerSuggestions: string[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function BudgetRecommendations({
  recommendations,
  providerSuggestions,
}: BudgetRecommendationsProps): React.JSX.Element {
  if (recommendations.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">Budget Recommendations</h3>
        <p className="mt-3 text-sm text-muted-foreground">
          Add more monthly expense history to generate recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-foreground">Budget Recommendations</h3>
      <div className="mt-4 space-y-3">
        {recommendations.slice(0, 6).map((item) => (
          <div key={item.category} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-foreground">{item.category}</p>
              <p className="font-semibold text-foreground">{formatCurrency(item.recommendedBudget)}</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Avg spend: {formatCurrency(item.currentAverage)}. {item.rationale}
            </p>
          </div>
        ))}
      </div>

      {providerSuggestions.length > 0 && (
        <div className="mt-4 rounded-lg bg-sky-50 p-3">
          <p className="text-sm font-medium text-sky-800">OpenRouter Suggestions</p>
          <ul className="mt-2 space-y-1 text-sm text-sky-700">
            {providerSuggestions.slice(0, 3).map((suggestion) => (
              <li key={suggestion}>- {suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
