"use client";

import { useMemo, useState } from "react";
import { api } from "@finance/api/react";
import { Skeleton } from "@finance/ui";
import { StatCard } from "./StatCard";
import { Filters } from "./Filters";
import { IncomeExpenseChart } from "./IncomeExpenseChart";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { BudgetProgressChart } from "./BudgetProgressChart";
import { CashFlowChart } from "./CashFlowChart";
import { QuickActions } from "./QuickActions";
import { TransactionItem } from "@/components/transactions/TransactionItem";
import { InsightsPanel } from "./InsightsPanel";
import { TrendAnalysis } from "./TrendAnalysis";
import { BudgetRecommendations } from "./BudgetRecommendations";
import { AnomalyDetection } from "./AnomalyDetection";

interface FilterState {
  dateFrom: Date | null;
  dateTo: Date | null;
  accountId: string | null;
  category: string | null;
}

export function Dashboard(): React.JSX.Element {
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: null,
    dateTo: null,
    accountId: null,
    category: null,
  });

  const analyticsInput = useMemo(
    () => ({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    }),
    [filters.dateFrom, filters.dateTo],
  );

  const analyticsQuery = api.dashboard.getAnalytics.useQuery(analyticsInput);
  const aiAnalyticsQuery = api.dashboard.getAIAnalytics.useQuery(analyticsInput);
  const recentTransactionsQuery = api.dashboard.getRecentTransactions.useQuery({ limit: 10 });
  const quickActionsQuery = api.dashboard.getQuickActions.useQuery();

  const loading =
    analyticsQuery.isLoading ||
    aiAnalyticsQuery.isLoading ||
    recentTransactionsQuery.isLoading ||
    quickActionsQuery.isLoading;
  const error = analyticsQuery.error ?? aiAnalyticsQuery.error ?? recentTransactionsQuery.error;

  const analytics = analyticsQuery.data;
  const aiAnalytics = aiAnalyticsQuery.data;
  const recentTransactions = recentTransactionsQuery.data?.items ?? [];

  const budgetChartData =
    aiAnalytics?.budgetRecommendations.slice(0, 6).map((item) => ({
      category: item.category,
      budgeted: item.recommendedBudget,
      spent: item.currentAverage,
      remaining: item.recommendedBudget - item.currentAverage,
    })) ?? [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>

        <Skeleton className="h-[200px] w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-[120px] w-full" />
          ))}
        </div>

        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  if (error || !analytics || !aiAnalytics) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <h3 className="text-lg font-semibold text-rose-900">Error Loading Dashboard</h3>
        <p className="mt-2 text-sm text-rose-700">{error?.message ?? "Unable to load data."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Overview of your financial status and AI-powered spending analysis
        </p>
      </div>

      {quickActionsQuery.data && quickActionsQuery.data.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Quick Actions</h3>
          <QuickActions />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Balance" value={analytics.totalBalance.toFixed(2)} icon={<Activity className="h-6 w-6" />} />
        <StatCard
          title="Net Cash Flow"
          value={analytics.netCashFlow.toFixed(2)}
          trend={{
            value: (analytics.netCashFlow / (Math.abs(analytics.totalIncome) || 1)) * 100,
            isPositive: analytics.netCashFlow >= 0,
          }}
          icon={<Activity className="h-6 w-6" />}
        />
        <StatCard title="Income" value={analytics.totalIncome.toFixed(2)} icon={<Activity className="h-6 w-6" />} />
        <StatCard title="Expense" value={analytics.totalExpense.toFixed(2)} icon={<Activity className="h-6 w-6" />} />
      </div>

      <InsightsPanel
        patterns={aiAnalytics.spendingPatterns}
        forecast={aiAnalytics.forecast}
        financialHealth={aiAnalytics.financialHealth}
        provider={aiAnalytics.provider}
      />

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <Filters initialFilters={filters} onFiltersChange={setFilters} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Income vs Expense</h3>
          {analytics.chartData.income.length > 0 ? (
            <IncomeExpenseChart
              data={analytics.chartData.income.map((item, index) => ({
                date: item.date,
                income: analytics.chartData.income[index]?.value || 0,
                expense: analytics.chartData.expense[index]?.value || 0,
              }))}
            />
          ) : (
            <div className="flex h-[400px] items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Category Breakdown</h3>
          {analytics.chartData.category.length > 0 ? (
            <CategoryBreakdown data={analytics.chartData.category as any} />
          ) : (
            <div className="flex h-[400px] items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Budget Progress</h3>
          {budgetChartData.length > 0 ? (
            <BudgetProgressChart data={budgetChartData} />
          ) : (
            <div className="flex h-[400px] items-center justify-center text-muted-foreground">
              No recommendation data available
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Cash Flow</h3>
          {analytics.chartData.cashFlow.length > 0 ? (
            <CashFlowChart data={analytics.chartData.cashFlow} />
          ) : (
            <div className="flex h-[400px] items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TrendAnalysis trends={aiAnalytics.categoryTrends} />
        <BudgetRecommendations
          recommendations={aiAnalytics.budgetRecommendations}
          providerSuggestions={aiAnalytics.providerSuggestions}
        />
      </div>

      <AnomalyDetection anomalies={aiAnalytics.anomalies} />

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Recent Transactions</h3>
        {recentTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent transactions.</p>
        ) : (
          <div className="space-y-0">
            {recentTransactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction as any} variant="row" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Activity({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
