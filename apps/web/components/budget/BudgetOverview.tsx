"use client";

import { api } from "@finance/api/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from "@finance/ui";

import { BudgetProgress } from "./BudgetProgress";

interface BudgetOverviewProps {
  filter?: "all" | "monthly" | "annual" | "custom";
}

export function BudgetOverview({ filter = "all" }: BudgetOverviewProps): React.JSX.Element {
  const {
    data: budgets,
    isLoading,
    error,
  } = api.budget.list.useQuery({
    page: 1,
    limit: 50,
  });

  const filteredBudgets =
    filter === "all"
      ? budgets?.items || []
      : (budgets?.items || []).filter(
          (budget) => (budget.type as unknown as string).toLowerCase() === filter,
        );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <BudgetOverviewSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
        <p className="text-destructive font-medium">Failed to load budgets</p>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (filteredBudgets.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center space-y-4 text-center p-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-muted-foreground"
            aria-hidden="true"
          >
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
          </svg>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">No budgets yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Create your first budget to track your spending and reach your financial goals.
          </p>
        </div>
      </div>
    );
  }

  // Calculate total budget metrics (list endpoint doesn't compute these, fall back to 0)
  type BudgetWithComputed = (typeof filteredBudgets)[number] & {
    totalBudgeted?: number;
    spent?: number;
  };
  const totalBudgeted = (filteredBudgets as BudgetWithComputed[]).reduce(
    (sum, budget) => sum + (budget.totalBudgeted ?? 0),
    0,
  );
  const totalSpent = (filteredBudgets as BudgetWithComputed[]).reduce(
    (sum, budget) => sum + (budget.spent ?? 0),
    0,
  );
  const remaining = totalBudgeted - totalSpent;

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Budget Overview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your spending against your budget
          </p>
        </div>
        <div className="flex gap-2">
          {["all", "monthly", "annual", "custom"].map((f) => (
            <button
              key={f}
              onClick={() => {}}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }
              `}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total Budgeted
              </p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums">
                {totalBudgeted.toFixed(2)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total Spent
              </p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums">
                {totalSpent.toFixed(2)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M6 14 2 11l4-3" />
                <path d="M2 11h9" />
                <path d="M18 10 22 13l-4 3" />
                <path d="M22 13h-9" />
                <path d="m18 6 3 3-3 3" />
                <path d="m6 18-3-3 3-3" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Remaining
              </p>
              <p
                className={`mt-1 text-2xl font-bold font-mono tabular-nums ${remaining >= 0 ? "text-gray-900" : "text-rose-600"}`}
              >
                {remaining.toFixed(2)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Budget List */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(filteredBudgets as BudgetWithComputed[]).map((budget) => {
          const remaining = (budget.totalBudgeted ?? 0) - (budget.spent ?? 0);
          return (
            <Card key={budget.id} className="group hover:border-blue-500/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{budget.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Type: {budget.type} • Period: {budget.period}
                    </CardDescription>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      budget.type === "MONTHLY"
                        ? "bg-blue-100 text-blue-700"
                        : budget.type === "ANNUAL"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {budget.type}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <BudgetProgress
                    budget={budget}
                    spent={budget.spent ?? 0}
                    totalBudgeted={budget.totalBudgeted ?? 0}
                    remaining={remaining}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function BudgetOverviewSkeleton(): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-24" />
      </CardContent>
    </Card>
  );
}
