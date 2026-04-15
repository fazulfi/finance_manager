"use client";

import { api } from "@finance/api/react";
import { type Project, ProjectStatus } from "@finance/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from "@finance/ui";

import { BudgetProgress } from "./BudgetProgress";

interface ProjectBudgetProps {
  project: Project;
}

function ProjectBudgetCard({ project }: ProjectBudgetProps): React.JSX.Element {
  // Get budgets that include this project
  const { data: projectBudgets } = api.budget.list.useQuery(
    {
      page: 1,
      limit: 100,
    },
    {
      enabled: !!project,
    },
  );

  // Find budget that targets this project
  const projectBudget = projectBudgets?.items?.find((budget) =>
    budget.items.some(
      (item) => item.isProject && (item.categoryId === project.id || item.name === project.name),
    ),
  );

  if (!projectBudget) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{project.name}</CardTitle>
          <CardDescription>No budget set for this project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <BudgetProgress
              budget={null}
              spent={project.spent || 0}
              totalBudgeted={project.budget || 0}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find project budget item
  const projectBudgetItem = projectBudget.items.find(
    (item) => item.isProject && (item.categoryId === project.id || item.name === project.name),
  );

  if (!projectBudgetItem) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{project.name}</CardTitle>
          <CardDescription>No budget item configured for this project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <BudgetProgress
              budget={null}
              spent={project.spent || 0}
              totalBudgeted={project.budget || 0}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalBudgeted = projectBudgetItem.budgeted;
  const spent = projectBudgetItem.spent || project.spent || 0;
  const remaining = totalBudgeted - spent;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <CardDescription>Budget period: {projectBudget.period}</CardDescription>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
              project.status === ProjectStatus.ACTIVE
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {project.status === ProjectStatus.ACTIVE ? "Active" : "Completed"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <BudgetProgress
            budget={projectBudget}
            spent={spent}
            totalBudgeted={totalBudgeted}
            remaining={remaining}
          />
          <p className="text-xs text-muted-foreground">
            {spent.toFixed(2)} of {totalBudgeted.toFixed(2)} spent
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectBudgetSkeleton(): React.JSX.Element {
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

export { ProjectBudgetCard, ProjectBudgetSkeleton };
