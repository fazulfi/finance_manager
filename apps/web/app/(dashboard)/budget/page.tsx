// apps/web/app/(dashboard)/budget/page.tsx
// Budget page Server Component - displays all budgets with overview and management

import { Button } from "@finance/ui";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BudgetOverview } from "@/components/budget/BudgetOverview";

export const metadata: Metadata = {
  title: "Budgets",
  description: "Manage your budgets and track spending",
};

export default async function BudgetPage(): Promise<React.JSX.Element> {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Plan and track your spending across categories and projects
        </p>
      </div>

      {/* Budget Overview Component */}
      <BudgetOverview />

      {/* Create Budget Button (Client Component would be needed for proper click handler) */}
      <div className="mt-8">
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Create New Budget
        </Button>
      </div>

      {/* Alternative: Link to a client component with create budget dialog */}
      <div className="mt-4 text-center">
        <Link
          href="/budget/create"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Or use the budget creation page
        </Link>
      </div>
    </div>
  );
}
