"use client";

import Link from "next/link";
import { api } from "@finance/api/react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  buttonVariants,
} from "@finance/ui";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectForm } from "@/components/projects/ProjectForm";

interface ProjectDetailPageProps {
  params: {
    id: string;
  };
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const projectQuery = api.project.getById.useQuery({ id: params.id });
  const analyticsQuery = api.project.getAnalytics.useQuery(
    { id: params.id },
    { enabled: !!projectQuery.data },
  );

  if (projectQuery.isLoading || analyticsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-60 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (
    projectQuery.isError ||
    !projectQuery.data ||
    analyticsQuery.isError ||
    !analyticsQuery.data
  ) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-5 w-5 text-destructive" aria-hidden="true" />
          <p className="text-sm text-destructive">
            {projectQuery.error?.message ?? analyticsQuery.error?.message ?? "Project not found"}
          </p>
          <Link href="/projects" className={buttonVariants({ className: "mt-4" })}>
            Back to projects
          </Link>
        </div>
      </div>
    );
  }

  const project = projectQuery.data;
  const analytics = analyticsQuery.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <Link href="/projects" className={buttonVariants({ variant: "outline", className: "gap-2" })}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to projects
      </Link>

      <ProjectCard project={project} analytics={analytics} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Spent</CardTitle>
            <CardDescription>Total expense tagged to this project</CardDescription>
          </CardHeader>
          <CardContent className="font-mono text-2xl tabular-nums">
            {formatMoney(analytics.spent)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Burn rate</CardTitle>
            <CardDescription>Average daily spend</CardDescription>
          </CardHeader>
          <CardContent className="font-mono text-2xl tabular-nums">
            {formatMoney(analytics.burnRatePerDay)}/day
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Estimated completion</CardTitle>
            <CardDescription>Forecast based on current burn rate</CardDescription>
          </CardHeader>
          <CardContent className="font-mono text-2xl tabular-nums">
            {analytics.estimatedCompletionDate
              ? new Date(analytics.estimatedCompletionDate).toLocaleDateString()
              : "—"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Project settings</CardTitle>
            <CardDescription>Update project status, budget, and timeline.</CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={() => setEditing((prev) => !prev)}>
            {editing ? "Close" : "Edit"}
          </Button>
        </CardHeader>
        <CardContent>
          {editing ? (
            <ProjectForm
              mode="update"
              project={project}
              onCancel={() => setEditing(false)}
              onSuccess={() => {
                setEditing(false);
                void Promise.all([projectQuery.refetch(), analyticsQuery.refetch()]);
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Click edit to update this project.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
