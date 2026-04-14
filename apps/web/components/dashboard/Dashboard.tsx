// apps/web/components/dashboard/Dashboard.tsx
"use client";

import { Suspense, useState, useEffect } from "react";
import { Skeleton } from "@finance/ui";
import { auth } from "@/auth";
import { StatCard } from "./StatCard";
import { Filters } from "./Filters";
import { IncomeExpenseChart } from "./IncomeExpenseChart";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { BudgetProgressChart } from "./BudgetProgressChart";
import { CashFlowChart } from "./CashFlowChart";
import { RecentTransactions } from "./RecentTransactions";
import { QuickActions } from "./QuickActions";
import type { DashboardAnalyticsOutput } from "@finance/types";

interface FilterState {
  dateFrom: Date | null;
  dateTo: Date | null;
  accountId: string | null;
  category: string | null;
}

export function Dashboard() {
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: null,
    dateTo: null,
    accountId: null,
    category: null,
  });

  async function getAnalytics(
    filters?: Partial<FilterState>,
  ): Promise<DashboardAnalyticsOutput | null> {
    const session = await auth();
    if (!session?.user) return null;

    const { createCallerFactory } = await import("@finance/api/trpc");
    const callerFactory = createCallerFactory();
    const trpc = await callerFactory();
    try {
      const analytics = await trpc.dashboard.getAnalytics(filters);
      return analytics;
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      return null;
    }
  }

  async function getRecentTransactions() {
    const session = await auth();
    if (!session?.user) return [];

    const { createCallerFactory } = await import("@finance/api/trpc");
    const callerFactory = createCallerFactory();
    const trpc = await callerFactory();
    try {
      const result = await trpc.dashboard.getRecentTransactions({ limit: 10 });
      return result.items || [];
    } catch (error) {
      console.error("Failed to fetch recent transactions:", error);
      return [];
    }
  }

  async function getQuickActions() {
    const session = await auth();
    if (!session?.user) return [];

    const { createCallerFactory } = await import("@finance/api/trpc");
    const callerFactory = createCallerFactory();
    const trpc = await callerFactory();
    try {
      const actions = await trpc.dashboard.getQuickActions();
      return actions;
    } catch (error) {
      console.error("Failed to fetch quick actions:", error);
      return [];
    }
  }

  const [analytics, setAnalytics] = useState<DashboardAnalyticsOutput | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<
    DashboardAnalyticsOutput["chartData"]["income"]
  >([]);
  const [quickActions, setQuickActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [analyticsData, transactions, actions] = await Promise.all([
          getAnalytics(filters),
          getRecentTransactions(),
          getQuickActions(),
        ]);

        setAnalytics(analyticsData);
        setRecentTransactions(transactions);
        setQuickActions(actions);
        setError(null);
      } catch (err) {
        setError("Failed to load dashboard data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [filters]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>

        <Skeleton className="h-[200px] w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full" />
          ))}
        </div>

        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <h3 className="text-lg font-semibold text-rose-900">Error Loading Dashboard</h3>
        <p className="mt-2 text-sm text-rose-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Overview of your financial status and recent activity
        </p>
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <QuickActions />
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Balance"
          value={analytics?.totalBalance?.toFixed(2) || "0.00"}
          icon={<Activity className="h-6 w-6" />}
        />
        <StatCard
          title="Net Cash Flow"
          value={analytics?.netCashFlow?.toFixed(2) || "0.00"}
          trend={
            analytics?.netCashFlow !== undefined && analytics?.totalIncome !== undefined
              ? {
                  value: (analytics.netCashFlow / (Math.abs(analytics.totalIncome) || 1)) * 100,
                  isPositive: analytics.netCashFlow >= 0,
                }
              : undefined
          }
          icon={<Activity className="h-6 w-6" />}
        />
        <StatCard
          title="Income"
          value={analytics?.totalIncome?.toFixed(2) || "0.00"}
          icon={<Activity className="h-6 w-6" />}
        />
        <StatCard
          title="Expense"
          value={analytics?.totalExpense?.toFixed(2) || "0.00"}
          icon={<Activity className="h-6 w-6" />}
        />
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <Filters initialFilters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Income vs Expense</h3>
          {analytics?.chartData && analytics.chartData.income.length > 0 ? (
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
          <h3 className="text-lg font-semibold text-foreground mb-4">Category Breakdown</h3>
          {analytics?.chartData && analytics.chartData.category.length > 0 ? (
            <CategoryBreakdown data={analytics.chartData.category} />
          ) : (
            <div className="flex h-[400px] items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Budget and Cash Flow */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Budget Progress</h3>
          <BudgetProgressChart data={[]} />
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Cash Flow</h3>
          {analytics?.chartData && analytics.chartData.cashFlow.length > 0 ? (
            <CashFlowChart data={analytics.chartData.cashFlow} />
          ) : (
            <div className="flex h-[400px] items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <Suspense fallback={<Skeleton className="h-[200px] w-full" />}>
        <RecentTransactions limit={10} />
      </Suspense>
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
