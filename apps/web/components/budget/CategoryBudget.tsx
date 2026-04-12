"use client";

import { api } from "@finance/api/react";
import { type Category, CategoryType } from "@finance/types";
import { BudgetProgress } from "./BudgetProgress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from "@finance/ui";

interface CategoryBudgetProps {
  category: Category;
}

function CategoryBudgetCard({ category }: CategoryBudgetProps): React.JSX.Element {
  // Get category-specific budgets (category budgets where category is targeted)
  const { data: categoryBudgets } = api.budget.list.useQuery(
    {
      page: 1,
      limit: 100,
    },
    {
      enabled: !!category,
    },
  );

  // Find budget that targets this category
  const categoryBudget = categoryBudgets?.items?.find((budget) =>
    budget.items.some((item) => item.categoryId === category.id || item.name === category.name),
  );

  if (!categoryBudget) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{category.name}</CardTitle>
          <CardDescription>
            {category.type === CategoryType.INCOME
              ? "Income budget not configured"
              : "No budget set for this expense category"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <BudgetProgress
              budget={categoryBudget || (category as unknown as any)}
              spent={0}
              totalBudgeted={category.type === CategoryType.INCOME ? 0 : 0}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate total spent and budgeted for this category
  const categoryBudgetItem = categoryBudget.items.find(
    (item) => item.categoryId === category.id || item.name === category.name,
  );

  if (!categoryBudgetItem) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{category.name}</CardTitle>
          <CardDescription>No budget item configured for this category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <BudgetProgress
              budget={categoryBudget || (category as unknown as any)}
              spent={0}
              totalBudgeted={0}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalBudgeted = categoryBudgetItem.budgeted;
  const spent = categoryBudgetItem.spent || 0;
  const remaining = totalBudgeted - spent;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{category.name}</CardTitle>
            <CardDescription>Budget period: {categoryBudget.period}</CardDescription>
          </div>
          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset">
            <span
              className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                category.type === CategoryType.INCOME ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            {category.type === CategoryType.INCOME ? "Income" : "Expense"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <BudgetProgress
            budget={categoryBudget}
            spent={spent}
            totalBudgeted={totalBudgeted}
            remaining={remaining}
          />
          <p className="text-xs text-muted-foreground">
            {category.type === CategoryType.INCOME
              ? "Income budgets are for planning purposes"
              : `${spent.toFixed(2)} of ${totalBudgeted.toFixed(2)} spent`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryBudgetSkeleton(): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-20" />
      </CardContent>
    </Card>
  );
}

export { CategoryBudgetCard, CategoryBudgetSkeleton };
